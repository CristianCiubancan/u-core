/**
 * Configuration loader
 */
import * as path from 'path';
import * as fs from 'fs';
import { BuildConfig } from '../core/types.js';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // Load environment variables from .env file

/**
 * Default configuration
 */
const defaultConfig: BuildConfig = {
  env: {},
  options: {
    minify: false,
    sourceMaps: true,
    clean: true,
  },
  paths: {
    rootDir: process.cwd(),
    pluginsDir: path.join(process.cwd(), 'src', 'plugins'),
    coreDir: path.join(process.cwd(), 'src', 'core'),
    distDir: path.join(process.cwd(), 'dist'),
    webviewDir: path.join(process.cwd(), 'src', 'webview'),
  },
  reloader: {
    enabled: false,
    host: 'localhost',
    port: 3414,
    apiKey: 'your-secure-api-key',
  },
};

/**
 * Configuration loader
 */
export class ConfigLoader {
  /**
   * Load configuration
   * @param options Options to override default configuration
   * @returns Build configuration
   */
  static load(options: Partial<BuildConfig> = {}): BuildConfig {
    // Start with default configuration
    const config = { ...defaultConfig };

    // Load environment variables
    this.loadEnvVars(config);

    // Override with provided options
    this.mergeConfigs(config, options);

    return config;
  }

  /**
   * Load environment variables
   * @param config Configuration to update
   */
  private static loadEnvVars(config: BuildConfig): void {
    // Load environment variables
    config.env = { ...process.env } as Record<string, string>;

    // Update reloader configuration from environment variables
    if (process.env.RELOADER_ENABLED) {
      config.reloader.enabled = process.env.RELOADER_ENABLED === 'true';
    }
    if (process.env.RELOADER_HOST) {
      config.reloader.host = process.env.RELOADER_HOST;
    }
    if (process.env.RELOADER_PORT) {
      config.reloader.port = parseInt(process.env.RELOADER_PORT, 10);
    }
    if (process.env.RELOADER_API_KEY) {
      config.reloader.apiKey = process.env.RELOADER_API_KEY;
    }

    // Update paths from environment variables
    if (process.env.PLUGINS_DIR) {
      config.paths.pluginsDir = process.env.PLUGINS_DIR;
    }
    if (process.env.CORE_DIR) {
      config.paths.coreDir = process.env.CORE_DIR;
    }
    if (process.env.DIST_DIR) {
      config.paths.distDir = process.env.DIST_DIR;
    }
    if (process.env.WEBVIEW_DIR) {
      config.paths.webviewDir = process.env.WEBVIEW_DIR;
    }
  }

  /**
   * Merge configurations
   * @param target Target configuration
   * @param source Source configuration
   */
  private static mergeConfigs(
    target: BuildConfig,
    source: Partial<BuildConfig>
  ): void {
    // Merge options
    if (source.options) {
      target.options = { ...target.options, ...source.options };
    }

    // Merge paths
    if (source.paths) {
      target.paths = { ...target.paths, ...source.paths };
    }

    // Merge reloader
    if (source.reloader) {
      target.reloader = { ...target.reloader, ...source.reloader };
    }

    // Merge environment variables
    if (source.env) {
      target.env = { ...target.env, ...source.env };
    }
  }

  /**
   * Get project paths
   * @returns Project paths
   */
  static getProjectPaths(): {
    pluginsDir: string;
    coreDir: string;
    distDir: string;
    webviewDir: string;
  } {
    const config = this.load();
    return {
      pluginsDir: config.paths.pluginsDir,
      coreDir: config.paths.coreDir,
      distDir: config.paths.distDir,
      webviewDir: config.paths.webviewDir,
    };
  }
}
