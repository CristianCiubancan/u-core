// managers/PluginReloadManager.ts
import 'dotenv/config';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { Ajv, type ValidateFunction } from 'ajv';
import { Plugin } from '../types/Plugin.js';
import { Logger, createLogger } from '../Logger.js';

/**
 * How long to wait for the in-game reload endpoint before giving up. The
 * watcher serializes rebuilds behind reload calls — without this ceiling
 * one stalled FXServer connection wedges the entire dev loop until the
 * developer kills `pnpm dev`. 5000ms is a deliberate ceiling: a healthy
 * StopResource → 500ms settle → StartResource cycle finishes well below it.
 */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Options for configuring the PluginReloadManager
 */
export interface ReloadOptions {
  /**
   * API key for authenticating with the resource management server
   * @default process.env.RELOADER_API_KEY
   */
  apiKey?: string;

  /**
   * Hostname of the resource management server
   * @default 'localhost'
   */
  host?: string;

  /**
   * Port of the resource management server
   * @default 3414
   */
  port?: number;

  /**
   * Whether to use HTTPS instead of HTTP
   * @default false
   */
  https?: boolean;

  /**
   * Log level
   * @default 'info'
   */
  logLevel?: 'verbose' | 'info' | 'warn' | 'error';
}

/**
 * Result of a reload operation
 */
export interface ReloadResult {
  success: boolean;
  message: string;
  resource?: string;
  results?: Record<string, boolean>;
}

interface ResourcesResponse {
  success: boolean;
  resources?: string[];
  count?: number;
}

interface RestartResponse {
  success: boolean;
  message?: string;
  resource?: string;
  results?: Record<string, boolean>;
}

const ajv = new Ajv({ allErrors: true, strict: false });

const resourcesResponseValidator: ValidateFunction<ResourcesResponse> =
  ajv.compile<ResourcesResponse>({
    type: 'object',
    required: ['success'],
    properties: {
      success: { type: 'boolean' },
      resources: { type: 'array', items: { type: 'string' } },
      count: { type: 'integer', minimum: 0 },
    },
  });

const restartResponseValidator: ValidateFunction<RestartResponse> =
  ajv.compile<RestartResponse>({
    type: 'object',
    required: ['success'],
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      resource: { type: 'string' },
      results: { type: 'object', additionalProperties: { type: 'boolean' } },
    },
  });

function formatErrors(errors: ValidateFunction['errors']): string {
  if (!errors) return '(none)';
  return errors
    .slice(0, 5)
    .map((e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`)
    .join('; ');
}

/**
 * Plugin Reload Manager
 * This class provides functionality to reload FiveM resources after they are built
 */
export class PluginReloadManager {
  private apiKey: string;
  private baseUrl: string;
  private initialized: boolean = false;
  private useHttps: boolean;
  private logger: Logger;

  /**
   * Creates a new PluginReloadManager instance
   * @param options Configuration options
   * @param logger Logger instance; defaults to a console-backed logger if omitted
   */
  constructor(
    options: ReloadOptions = {},
    logger: Logger = createLogger({
      level: options.logLevel,
      prefix: 'PluginReloadManager',
    })
  ) {
    this.apiKey = options.apiKey || process.env.RELOADER_API_KEY || '';
    this.useHttps = options.https || false;
    this.logger = logger;

    const host = options.host || 'localhost';
    const port = options.port || 3414;
    const protocol = this.useHttps ? 'https' : 'http';

    this.baseUrl = `${protocol}://${host}:${port}`;
  }

  /**
   * Initialize the reload manager by probing the server. Safe to call
   * repeatedly: each call retries the probe and updates the `initialized`
   * flag. Failure is recorded but never throws; the manager stays usable
   * so a later FXServer startup can succeed without rebuilding the
   * `BuildManager`.
   */
  async initialize(): Promise<boolean> {
    try {
      this.log('info', 'Initializing plugin reload manager...');

      if (!this.apiKey) {
        this.logger.warn(
          'API key is unset; reload calls will fail until RELOADER_API_KEY is configured'
        );
        this.initialized = false;
        return false;
      }

      // Test connection directly instead of using getResources()
      await this.probeResources();

      this.initialized = true;
      this.log('info', 'Plugin reload manager initialized successfully');
      return true;
    } catch (error) {
      this.initialized = false;
      this.logger.warn(
        'Failed to initialize PluginReloadManager (will retry on next reload attempt)',
        error
      );
      return false;
    }
  }

  /**
   * Whether the most recent probe (or call) succeeded. Watchers can read
   * this to decide whether to skip the reload step on a build.
   */
  isHealthy(): boolean {
    return this.initialized;
  }

  /**
   * Probe `/resources` and validate the response. Used by `initialize`
   * and `getResources`. Separated so the probe path narrows responses
   * the same way every other endpoint does.
   */
  private async probeResources(): Promise<string[]> {
    const response = await this.makeRequest('/resources');
    if (!resourcesResponseValidator(response)) {
      throw new Error(
        `Unexpected /resources response shape: ${formatErrors(resourcesResponseValidator.errors)}`
      );
    }
    return response.resources ?? [];
  }

  /**
   * Gets the list of all resources from the server
   */
  async getResources(): Promise<string[]> {
    await this.ensureInitialized();

    try {
      return await this.probeResources();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to get resources: ${errorMessage}`);
      throw new Error(`Failed to get resources: ${errorMessage}`);
    }
  }

  /**
   * Reloads a specific resource on the server
   * @param resourceName The name of the resource to reload
   */
  async reloadResource(resourceName: string): Promise<ReloadResult> {
    if (!(await this.ensureInitialized())) {
      return {
        success: false,
        message: 'Reload manager not initialized',
        resource: resourceName,
      };
    }

    try {
      this.log('info', `Reloading resource: ${resourceName}`);

      const raw = await this.makeRequest(
        `/restart?resource=${encodeURIComponent(resourceName)}`,
        'POST'
      );
      if (!restartResponseValidator(raw)) {
        throw new Error(
          `Unexpected /restart response shape: ${formatErrors(restartResponseValidator.errors)}`
        );
      }
      const response = raw;

      if (response.success) {
        this.log('info', `Successfully reloaded resource: ${resourceName}`);
      } else {
        this.log('warn', `Failed to reload resource: ${resourceName}`);
      }

      return {
        success: response.success,
        message: response.message ?? '',
        resource: resourceName,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(
        'error',
        `Error reloading resource ${resourceName}: ${errorMessage}`
      );
      // A network or timeout error makes the next call worth re-probing
      this.initialized = false;

      return {
        success: false,
        message: `Error: ${errorMessage}`,
        resource: resourceName,
      };
    }
  }

  /**
   * Reloads a plugin on the server by plugin name
   * @param plugin The plugin object or plugin name to reload
   */
  async reloadPlugin(plugin: Plugin | string): Promise<ReloadResult> {
    const pluginName = typeof plugin === 'string' ? plugin : plugin.pluginName;
    return this.reloadResource(pluginName);
  }

  /**
   * Reloads all resources on the server
   */
  async reloadAllResources(): Promise<ReloadResult> {
    if (!(await this.ensureInitialized())) {
      return {
        success: false,
        message: 'Reload manager not initialized',
      };
    }

    try {
      this.log('info', 'Reloading all resources');

      const raw = await this.makeRequest('/restart', 'POST');
      if (!restartResponseValidator(raw)) {
        throw new Error(
          `Unexpected /restart response shape: ${formatErrors(restartResponseValidator.errors)}`
        );
      }
      const response = raw;

      if (response.success) {
        this.log('info', 'Successfully reloaded all resources');
      } else {
        this.log('warn', 'Some resources failed to reload');
      }

      return {
        success: response.success,
        message: response.message ?? '',
        results: response.results,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log('error', `Error reloading all resources: ${errorMessage}`);
      this.initialized = false;

      return {
        success: false,
        message: `Error: ${errorMessage}`,
      };
    }
  }

  /**
   * Make an HTTP request to the resource management API. Returns the
   * parsed JSON body as `unknown`; the caller is responsible for
   * narrowing it with a runtime validator before reading fields. A
   * `setTimeout` of `REQUEST_TIMEOUT_MS` is attached to every request
   * so a hung FXServer cannot stall the watcher indefinitely.
   * @param endpoint The API endpoint
   * @param method The HTTP method to use
   * @private
   */
  private makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(endpoint, this.baseUrl);

        const options = {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        };

        this.log('verbose', `Making ${method} request to: ${url.toString()}`);

        const httpModule = this.useHttps ? https : http;
        const req = httpModule.request(url, options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (
              res.statusCode &&
              (res.statusCode < 200 || res.statusCode >= 300)
            ) {
              reject(new Error(`HTTP error ${res.statusCode}: ${data}`));
              return;
            }

            try {
              const jsonData: unknown = JSON.parse(data);
              resolve(jsonData);
            } catch {
              reject(new Error(`Invalid JSON response: ${data}`));
            }
          });
        });

        // Per-request timeout. `req.setTimeout` only schedules a callback;
        // explicit `req.destroy(error)` is what surfaces the failure as a
        // rejection via the 'error' listener below. Literal 5000ms keeps
        // the ceiling visible at the call site.
        req.setTimeout(5000, () => {
          req.destroy(
            new Error(
              `Reload request to ${url.toString()} timed out after ${REQUEST_TIMEOUT_MS}ms`
            )
          );
        });

        req.on('error', (error) => {
          this.log('error', `Request failed: ${error.message}`);
          reject(error);
        });

        req.end();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.log('error', `Request setup failed: ${errorMessage}`);
        reject(error);
      }
    });
  }

  /**
   * Ensure the manager has had a successful probe at least once. If the
   * previous probe failed (or marked the manager unhealthy after a
   * transient error), re-run `initialize` so a recovered FXServer
   * doesn't require restarting `pnpm dev`.
   * @private
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    return this.initialize();
  }

  /**
   * Logs a message with the specified level via the injected Logger.
   * Kept as a private indirection so existing call sites in this file
   * (this.log('info', '...')) continue to compile without churn.
   * @private
   */
  private log(
    level: 'verbose' | 'info' | 'warn' | 'error',
    message: string
  ): void {
    this.logger[level](message);
  }
}
