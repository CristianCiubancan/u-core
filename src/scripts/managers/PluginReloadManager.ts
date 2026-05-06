// managers/PluginReloadManager.ts
import 'dotenv/config';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { Ajv, type ValidateFunction } from 'ajv';
import { Plugin } from '../types/Plugin.js';
import { Logger, createLogger } from '../Logger.js';

/**
 * How long to wait on probe-style endpoints (`/resources`, etc.). Short
 * by design: probes are health checks, not lifecycle ops. A stalled
 * probe means FXServer is hung and the watcher should give up promptly.
 */
const PROBE_TIMEOUT_MS = 5000;

/**
 * How long to wait on lifecycle endpoints (`/restart`, `/stop`,
 * `/start`). Comfortably exceeds the FXServer-side ceilings:
 * `STOP_TIMEOUT_MS=5s` + `START_TIMEOUT_MS=10s` = 15 s worst-case per
 * call, plus FXServer dispatch overhead.
 *
 * Setting this BELOW the server-side ceiling was the source of the
 * cascade-restart we hit under save spam: the watcher would time out at
 * 5 s, the FXServer-side state poll was still legitimately running, and
 * BuildManager would proceed to `rm destDir && rename tmpDir` while
 * FXServer was mid-StopResource — exactly the dist-swap-while-running
 * race the lifecycle was supposed to eliminate. Keep this >> the sum of
 * the server-side timeouts so a "watcher timeout" only fires when
 * FXServer is actually hung, not just slow.
 */
const LIFECYCLE_TIMEOUT_MS = 30000;

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
  /**
   * The resource's `GetResourceState` value at the moment the lifecycle
   * settled. Useful for distinguishing "start timed out" (state still
   * 'starting') from "start landed in stopped" (script env failed to
   * load). Only emitted by per-resource endpoints — undefined for the
   * bulk `reloadAllResources` path.
   */
  state?: string;
  results?: Record<string, boolean>;
}

interface ResourcesResponse {
  success: boolean;
  resources?: string[];
  count?: number;
  states?: Record<string, string>;
}

interface RestartResponse {
  success: boolean;
  message?: string;
  resource?: string;
  state?: string;
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
      states: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
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
      state: { type: 'string' },
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
   * Snapshot every resource's `GetResourceState` value. Used by the
   * watcher to detect cascade-stops: when `_shared` (or any heavily
   * depended-on resource) is restarted, FXServer auto-stops every
   * dependent and never auto-restarts them. Snapshotting before the
   * lifecycle and diffing after lets the watcher restart anything that
   * was running before but was left in `stopped`.
   *
   * Returns null when the server response lacks the `states` field (an
   * older resource-manager build) — callers should treat that as
   * "cascade restoration unavailable" and proceed without it.
   */
  async getResourceStates(): Promise<Map<string, string> | null> {
    await this.ensureInitialized();

    const response = await this.makeRequest('/resources');
    if (!resourcesResponseValidator(response)) {
      throw new Error(
        `Unexpected /resources response shape: ${formatErrors(resourcesResponseValidator.errors)}`
      );
    }
    if (!response.states) return null;
    return new Map(Object.entries(response.states));
  }

  /**
   * Reloads a specific resource on the server (stop+start in one call).
   * Used by `reloadAllResources` and any caller that doesn't need to
   * gate work between the stop and the start. For build-pipeline use
   * (where dist must be swapped while the resource is stopped) call
   * {@link stopResource} + {@link startResource} separately.
   * @param resourceName The name of the resource to reload
   */
  async reloadResource(resourceName: string): Promise<ReloadResult> {
    return this.callLifecycleEndpoint(
      '/restart',
      resourceName,
      `Reloading resource: ${resourceName}`,
      `Successfully reloaded resource: ${resourceName}`,
      `Failed to reload resource: ${resourceName}`
    );
  }

  /**
   * Stop a resource on the server. Returns once the resource has
   * actually transitioned to 'stopped' (verified by the FXServer-side
   * `GetResourceState` poll), so the caller can safely mutate the
   * resource's dist tree before calling {@link startResource}.
   *
   * Idempotent: stopping an already-stopped resource is a success.
   * Stopping a 'missing' resource is a failure (the dev script can
   * skip the lifecycle for first-deploy plugins instead of asking
   * FXServer to stop something it doesn't know about yet).
   */
  async stopResource(resourceName: string): Promise<ReloadResult> {
    return this.callLifecycleEndpoint(
      '/stop',
      resourceName,
      `Stopping resource: ${resourceName}`,
      `Successfully stopped resource: ${resourceName}`,
      `Failed to stop resource: ${resourceName}`
    );
  }

  /**
   * Start a resource on the server. Returns once the resource has
   * actually reached 'started' (verified by `GetResourceState` poll on
   * the FXServer side). A start that lands the resource back in
   * 'stopped' (script env failed to populate) is reported as a failure
   * with the terminal state in {@link ReloadResult.state}.
   *
   * Idempotent: starting an already-started resource is a success.
   */
  async startResource(resourceName: string): Promise<ReloadResult> {
    return this.callLifecycleEndpoint(
      '/start',
      resourceName,
      `Starting resource: ${resourceName}`,
      `Successfully started resource: ${resourceName}`,
      `Failed to start resource: ${resourceName}`
    );
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
   * Shared call path for /restart, /stop, /start. Each of those
   * endpoints returns the same envelope shape (`success`, `message`,
   * `resource`, `state`), so the only thing varying between the three
   * is the URL and the log strings.
   * @private
   */
  private async callLifecycleEndpoint(
    endpoint: '/restart' | '/stop' | '/start',
    resourceName: string,
    startLog: string,
    successLog: string,
    failureLog: string
  ): Promise<ReloadResult> {
    if (!(await this.ensureInitialized())) {
      return {
        success: false,
        message: 'Reload manager not initialized',
        resource: resourceName,
      };
    }

    try {
      this.log('info', startLog);

      const raw = await this.makeRequest(
        `${endpoint}?resource=${encodeURIComponent(resourceName)}`,
        'POST'
      );
      if (!restartResponseValidator(raw)) {
        throw new Error(
          `Unexpected ${endpoint} response shape: ${formatErrors(
            restartResponseValidator.errors
          )}`
        );
      }
      const response = raw;

      if (response.success) {
        this.log('info', successLog);
      } else {
        this.log(
          'warn',
          `${failureLog}${response.message ? `: ${response.message}` : ''}`
        );
      }

      return {
        success: response.success,
        message: response.message ?? '',
        resource: resourceName,
        state: response.state,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(
        'error',
        `Error calling ${endpoint} for ${resourceName}: ${errorMessage}`
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
   * Determine the timeout for an endpoint. Lifecycle endpoints get the
   * generous {@link LIFECYCLE_TIMEOUT_MS}; all others (probes, etc.)
   * get the shorter {@link PROBE_TIMEOUT_MS}.
   */
  private timeoutForEndpoint(endpoint: string): number {
    // Match the path component, ignoring querystring (`/restart?resource=foo`).
    const path = endpoint.split('?', 1)[0];
    if (path === '/restart' || path === '/stop' || path === '/start') {
      return LIFECYCLE_TIMEOUT_MS;
    }
    return PROBE_TIMEOUT_MS;
  }

  /**
   * Make an HTTP request to the resource management API. Returns the
   * parsed JSON body as `unknown`; the caller is responsible for
   * narrowing it with a runtime validator before reading fields. A
   * per-endpoint timeout is attached so a hung FXServer cannot stall
   * the watcher indefinitely while still giving lifecycle ops enough
   * room to complete (see {@link LIFECYCLE_TIMEOUT_MS}).
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
        const timeoutMs = this.timeoutForEndpoint(endpoint);

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
        // rejection via the 'error' listener below.
        req.setTimeout(timeoutMs, () => {
          req.destroy(
            new Error(
              `Reload request to ${url.toString()} timed out after ${timeoutMs}ms`
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
