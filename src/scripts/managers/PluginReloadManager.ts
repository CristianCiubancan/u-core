// managers/PluginReloadManager.ts
import 'dotenv/config';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { Plugin } from '../types/Plugin.js';

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

/**
 * Plugin Reload Manager
 * This class provides functionality to reload FiveM resources after they are built
 */
export class PluginReloadManager {
  private apiKey: string;
  private baseUrl: string;
  private logLevel: ReloadOptions['logLevel'];
  private initialized: boolean = false;
  private useHttps: boolean;

  /**
   * Creates a new PluginReloadManager instance
   * @param options Configuration options
   */
  constructor(options: ReloadOptions = {}) {
    this.apiKey = options.apiKey || process.env.RELOADER_API_KEY || '';
    this.logLevel = options.logLevel || 'info';
    this.useHttps = options.https || false;

    const host = options.host || 'localhost';
    const port = options.port || 3414;
    const protocol = this.useHttps ? 'https' : 'http';

    this.baseUrl = `${protocol}://${host}:${port}`;
  }

  /**
   * Initializes the reload manager by testing the connection to the server
   * Must be called before using other methods
   */
  async initialize(): Promise<void> {
    try {
      this.log('info', 'Initializing plugin reload manager...');

      if (!this.apiKey) {
        throw new Error('API key is required for authentication');
      }

      // Test connection directly instead of using getResources()
      await this.makeRequest('/resources');

      this.initialized = true;
      this.log('info', 'Plugin reload manager initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(
        'error',
        `Failed to initialize plugin reload manager: ${errorMessage}`
      );
      throw new Error(
        `Failed to initialize PluginReloadManager: ${errorMessage}`
      );
    }
  }

  /**
   * Gets the list of all resources from the server
   */
  async getResources(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const response = await this.makeRequest('/resources');
      return response.resources || [];
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
    this.ensureInitialized();

    try {
      this.log('info', `Reloading resource: ${resourceName}`);

      const response = await this.makeRequest(
        `/restart?resource=${encodeURIComponent(resourceName)}`,
        'POST'
      );

      if (response.success) {
        this.log('info', `Successfully reloaded resource: ${resourceName}`);
      } else {
        this.log('warn', `Failed to reload resource: ${resourceName}`);
      }

      return {
        success: response.success,
        message: response.message || '',
        resource: resourceName,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(
        'error',
        `Error reloading resource ${resourceName}: ${errorMessage}`
      );

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
    this.ensureInitialized();

    try {
      this.log('info', 'Reloading all resources');

      const response = await this.makeRequest('/restart', 'POST');

      if (response.success) {
        this.log('info', 'Successfully reloaded all resources');
      } else {
        this.log('warn', 'Some resources failed to reload');
      }

      return {
        success: response.success,
        message: response.message || '',
        results: response.results,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log('error', `Error reloading all resources: ${errorMessage}`);

      return {
        success: false,
        message: `Error: ${errorMessage}`,
      };
    }
  }

  /**
   * Makes an HTTP request to the resource management API
   * @param endpoint The API endpoint
   * @param method The HTTP method to use
   * @private
   */
  private makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<any> {
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
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } catch (error) {
              reject(new Error(`Invalid JSON response: ${data}`));
            }
          });
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
   * Helper method to ensure the manager is initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'PluginReloadManager must be initialized before use. Call initialize() first.'
      );
    }
  }

  /**
   * Logs a message with the specified level
   * @param level The log level
   * @param message The message to log
   * @private
   */
  private log(
    level: 'verbose' | 'info' | 'warn' | 'error',
    message: string
  ): void {
    const logLevels = {
      'verbose': 0,
      'info': 1,
      'warn': 2,
      'error': 3,
    };

    // Skip if level is lower than configured level
    if (logLevels[level] < logLevels[this.logLevel!]) {
      return;
    }

    // Format timestamp
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Format prefix based on level
    let prefix;
    switch (level) {
      case 'verbose':
        prefix = `[${timestamp}] [VERBOSE]`;
        break;
      case 'info':
        prefix = `[${timestamp}] [INFO]`;
        break;
      case 'warn':
        prefix = `[${timestamp}] [WARN]`;
        break;
      case 'error':
        prefix = `[${timestamp}] [ERROR]`;
        break;
    }

    console.log(`${prefix} ${message}`);
  }
}
