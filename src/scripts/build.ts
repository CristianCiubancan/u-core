import { FileManager } from './managers/FileManager.js';
import { BuildManager } from './managers/BuildManager.js';
import { Plugin } from './types/Plugin.js';
import chalk from 'chalk';
import * as os from 'os';
import { performance } from 'perf_hooks';

interface BuildOptions {
  /**
   * Path to the plugins directory
   * @default 'src/plugins'
   */
  pluginsDir: string;

  /**
   * Path to the distribution directory
   * @default 'dist'
   */
  distDir: string;

  /**
   * Number of plugins to build in parallel
   * If not provided, it will use number of CPU cores - 1 (minimum 1)
   */
  concurrency?: number;

  /**
   * Whether to clean the dist directory before building
   * @default true
   */
  clean: boolean;

  /**
   * Log level
   * @default 'info'
   */
  logLevel: 'verbose' | 'info' | 'warn' | 'error';

  /**
   * Whether to continue building if a plugin fails
   * @default true
   */
  continueOnError: boolean;

  /**
   * Filter function to select which plugins to build
   * @param plugin Plugin object
   * @returns true if the plugin should be built, false otherwise
   */
  filter?: (plugin: Plugin) => boolean;
}

class PluginBuilder {
  private fileManager: FileManager;
  private buildManager: BuildManager;
  private options: BuildOptions;
  private startTime: number = 0;
  private pluginResults: Map<
    string,
    { success: boolean; time: number; error?: string }
  > = new Map();

  constructor(options: Partial<BuildOptions> = {}) {
    // Calculate default concurrency based on available CPU cores
    const defaultConcurrency = Math.max(1, os.cpus().length - 1);

    // Set default options
    this.options = {
      pluginsDir: options.pluginsDir || 'src/plugins',
      distDir: options.distDir || 'dist',
      concurrency:
        options.concurrency !== undefined
          ? options.concurrency
          : defaultConcurrency,
      clean: options.clean !== undefined ? options.clean : true,
      logLevel: options.logLevel || 'info',
      continueOnError:
        options.continueOnError !== undefined ? options.continueOnError : true,
      filter: options.filter,
    };

    this.fileManager = new FileManager(this.options.pluginsDir);
    this.buildManager = new BuildManager(
      this.fileManager,
      this.options.distDir
    );
  }

  /**
   * Initialize the builder
   */
  async initialize(): Promise<void> {
    // Start timing
    this.startTime = performance.now();

    this.log('info', chalk.bold('Initializing plugin builder...'));

    // Initialize managers
    await this.fileManager.initialize();
    await this.buildManager.initialize();

    this.log('info', chalk.green('✓') + ' Plugin builder initialized');
  }

  /**
   * Build all plugins
   */
  async buildAll(): Promise<boolean> {
    try {
      // Initialize if not already done
      // Using a method to check initialization instead of accessing private property
      await this.ensureInitialized();

      // Get all plugins
      let plugins = this.fileManager.getAllPlugins();

      // Apply filter if provided
      if (this.options.filter) {
        plugins = plugins.filter(this.options.filter);
      }

      // Report how many plugins we'll build
      const concurrency = this.options.concurrency || 1;
      this.log(
        'info',
        chalk.bold(
          `Building ${plugins.length} plugins with concurrency ${concurrency}`
        )
      );

      // Clean dist directory if requested
      if (this.options.clean) {
        this.log('info', 'Cleaning distribution directory...');
        await this.buildManager.clean();
        this.log('info', chalk.green('✓') + ' Distribution directory cleaned');
      }

      // Build plugins in parallel but with concurrency limit
      await this.buildPluginsWithConcurrency(plugins, concurrency);

      // Log completion
      const totalTime = ((performance.now() - this.startTime) / 1000).toFixed(
        2
      );
      const successCount = Array.from(this.pluginResults.values()).filter(
        (r) => r.success
      ).length;
      const failureCount = this.pluginResults.size - successCount;

      this.log(
        'info',
        chalk.bold(
          '\n============================ Build Summary ============================'
        )
      );
      this.log(
        'info',
        chalk.bold(`Total plugins processed: ${this.pluginResults.size}`)
      );
      this.log('info', chalk.green.bold(`✓ Success: ${successCount}`));

      if (failureCount > 0) {
        this.log('info', chalk.red.bold(`✗ Failed: ${failureCount}`));
        // List failed plugins
        for (const [pluginName, result] of this.pluginResults.entries()) {
          if (!result.success) {
            this.log('info', chalk.red(`  - ${pluginName}: ${result.error}`));
          }
        }
      }

      this.log('info', chalk.bold(`Total build time: ${totalTime}s`));
      this.log(
        'info',
        chalk.bold(
          '======================================================================'
        )
      );

      return failureCount === 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(
        'error',
        chalk.red.bold(`❌ Fatal build error: ${errorMessage}`)
      );

      if (error instanceof Error && error.stack) {
        this.log('verbose', chalk.red(`Stack trace:\n${error.stack}`));
      }

      return false;
    }
  }

  /**
   * Build plugins with concurrency control
   */
  /**
   * Ensures the builder is initialized
   */
  private async ensureInitialized(): Promise<void> {
    try {
      // Check if fileManager is already initialized by trying to call a method that requires initialization
      this.fileManager.getAllPlugins();
    } catch (error) {
      // If the call fails, we need to initialize
      await this.initialize();
    }
  }

  /**
   * Build plugins with concurrency control
   */
  private async buildPluginsWithConcurrency(
    plugins: Plugin[],
    concurrency: number
  ): Promise<void> {
    const queue = [...plugins];
    const inProgress = new Set<string>();
    const completed = new Set<string>();

    // Process queue until empty
    while (queue.length > 0 || inProgress.size > 0) {
      // Fill up to concurrency limit
      while (queue.length > 0 && inProgress.size < concurrency) {
        const plugin = queue.shift()!;
        inProgress.add(plugin.pluginName);

        // Start building this plugin (don't await here)
        this.buildSinglePlugin(plugin)
          .then(() => {
            inProgress.delete(plugin.pluginName);
            completed.add(plugin.pluginName);
          })
          .catch((error) => {
            inProgress.delete(plugin.pluginName);
            completed.add(plugin.pluginName);

            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.pluginResults.set(plugin.pluginName, {
              success: false,
              time: 0,
              error: errorMessage,
            });

            if (!this.options.continueOnError) {
              throw error;
            }
          });
      }

      // Delay slightly before checking again to reduce CPU usage
      if (
        inProgress.size >= concurrency ||
        (queue.length === 0 && inProgress.size > 0)
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Build a single plugin
   */
  private async buildSinglePlugin(plugin: Plugin): Promise<void> {
    const pluginStartTime = performance.now();

    try {
      // Log current plugin build
      this.log('info', chalk.cyan(`🔨 Building plugin: ${plugin.pluginName}`));

      // Build the plugin
      await this.buildManager.buildPlugin(plugin.pluginName);

      // Record success
      const buildTime = (performance.now() - pluginStartTime) / 1000;
      this.pluginResults.set(plugin.pluginName, {
        success: true,
        time: buildTime,
      });

      // Log completion
      this.log(
        'info',
        chalk.green(`✓ Built ${plugin.pluginName}`) +
          chalk.gray(` (${buildTime.toFixed(2)}s)`)
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Record failure
      const buildTime = (performance.now() - pluginStartTime) / 1000;
      this.pluginResults.set(plugin.pluginName, {
        success: false,
        time: buildTime,
        error: errorMessage,
      });

      // Log error
      this.log(
        'error',
        chalk.red(`✗ Failed to build ${plugin.pluginName}: ${errorMessage}`)
      );
      this.log(
        'verbose',
        chalk.red(
          `Stack trace:\n${
            error instanceof Error ? error.stack : 'No stack trace available'
          }`
        )
      );

      // Re-throw if we should stop on errors
      if (!this.options.continueOnError) {
        throw error;
      }
    }
  }

  /**
   * Log a message with the specified level
   */
  private log(
    level: 'verbose' | 'info' | 'warn' | 'error',
    message: string
  ): void {
    const logLevels = {
      verbose: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    // Skip if level is lower than configured level
    if (logLevels[level] < logLevels[this.options.logLevel]) {
      return;
    }

    // Format timestamp
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Format prefix based on level
    let prefix;
    switch (level) {
      case 'verbose':
        prefix = chalk.gray(`[${timestamp}] [VERBOSE]`);
        break;
      case 'info':
        prefix = chalk.blue(`[${timestamp}] [INFO]`);
        break;
      case 'warn':
        prefix = chalk.yellow(`[${timestamp}] [WARN]`);
        break;
      case 'error':
        prefix = chalk.red(`[${timestamp}] [ERROR]`);
        break;
    }

    console.log(`${prefix} ${message}`);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<BuildOptions> {
  const args = process.argv.slice(2);
  const options: Partial<BuildOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--plugins-dir':
      case '-p':
        options.pluginsDir = args[++i];
        break;
      case '--dist-dir':
      case '-d':
        options.distDir = args[++i];
        break;
      case '--concurrency':
      case '-c':
        options.concurrency = parseInt(args[++i], 10);
        break;
      case '--no-clean':
        options.clean = false;
        break;
      case '--log-level':
      case '-l':
        const level = args[++i];
        if (['verbose', 'info', 'warn', 'error'].includes(level)) {
          options.logLevel = level as BuildOptions['logLevel'];
        } else {
          console.error(`Invalid log level: ${level}. Using default.`);
        }
        break;
      case '--stop-on-error':
        options.continueOnError = false;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Print help text
 */
function printHelp(): void {
  console.log(`
Plugin Builder - Build plugins in parallel

Usage: ts-node build.ts [options]

Options:
  --plugins-dir, -p <dir>  Path to plugins directory (default: src/plugins)
  --dist-dir, -d <dir>     Path to distribution directory (default: dist)
  --concurrency, -c <num>  Number of plugins to build in parallel (default: CPU cores - 1)
  --no-clean               Don't clean the dist directory before building
  --log-level, -l <level>  Log level: verbose, info, warn, error (default: info)
  --stop-on-error          Stop building if a plugin fails
  --help, -h               Show this help message
`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const options = parseArgs();

    // Create plugin builder
    const builder = new PluginBuilder(options);

    // Initialize the builder
    await builder.initialize();

    // Build all plugins
    const success = await builder.buildAll();

    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Uncaught error:', error);
  process.exit(1);
});
