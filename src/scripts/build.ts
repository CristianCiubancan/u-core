import 'dotenv/config';
import { FileManager } from './managers/FileManager.js';
import { BuildManager } from './managers/BuildManager.js';
import { Plugin } from './types/Plugin.js';
import chalk from 'chalk';
import * as os from 'os';
import * as path from 'path';
import { performance } from 'perf_hooks';
import * as chokidar from 'chokidar';

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
   * Whether to watch for changes and rebuild
   * @default false
   */
  watch: boolean;
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
  private watcher: chokidar.FSWatcher | null = null;

  constructor(options: Partial<BuildOptions> = {}) {
    // Set default options
    this.options = {
      pluginsDir: options.pluginsDir || 'src/plugins',
      distDir:
        options.distDir ||
        `txData/${process.env.SERVER_NAME}/resources/[GENERATED]`,
      clean: options.clean !== undefined ? options.clean : true,
      logLevel: options.logLevel || 'info',
      continueOnError:
        options.continueOnError !== undefined ? options.continueOnError : true,
      watch: options.watch !== undefined ? options.watch : false,
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

    // Initialize reload manager if watching
    if (this.options.watch) {
      await this.buildManager.initializeReloadManager();
    }

    this.log('info', chalk.green('✓') + ' Plugin builder initialized');
  }

  /**
   * Build all plugins
   */
  async buildAll(): Promise<boolean> {
    try {
      // Initialize if not already done
      await this.ensureInitialized();

      // Get all plugins
      const plugins = this.fileManager.getAllPlugins();

      // Report how many plugins we'll build
      this.log(
        'info',
        chalk.bold(`Building ${plugins.length} plugins sequentially`)
      );

      // Clean dist directory if requested
      if (this.options.clean) {
        this.log('info', 'Cleaning distribution directory...');
        await this.buildManager.clean();
        this.log('info', chalk.green('✓') + ' Distribution directory cleaned');
      }

      // Build plugins sequentially
      for (const plugin of plugins) {
        await this.buildSinglePlugin(plugin);
      }

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

      // If in watch mode, start watching for changes
      if (this.options.watch && !this.watcher) {
        this.startWatching();
      }

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
   * Start watching for file changes
   */
  private startWatching(): void {
    this.log('info', chalk.bold('\nStarting watch mode...'));
    this.log(
      'info',
      chalk.blue('Watching for changes in: ') +
        chalk.cyan(this.options.pluginsDir)
    );
    this.log('info', chalk.gray('Press Ctrl+C to stop watching\n'));

    // Initialize watcher
    this.watcher = chokidar.watch(this.options.pluginsDir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    // Track which plugin was last changed to avoid multiple rebuilds for the same plugin
    let rebuildQueue = new Set<string>();
    let isBuilding = false;
    let debounceTimer: NodeJS.Timeout | null = null;

    const processRebuildQueue = async () => {
      if (isBuilding || rebuildQueue.size === 0) return;

      isBuilding = true;
      const pluginsToRebuild = Array.from(rebuildQueue);
      rebuildQueue.clear();

      try {
        this.log(
          'info',
          chalk.bold(
            `Rebuilding ${pluginsToRebuild.length} changed plugin(s)...`
          )
        );

        // Reset results for new build
        this.pluginResults.clear();
        this.startTime = performance.now();

        // Find the plugin objects for all changes
        const plugins: Plugin[] = [];
        for (const pluginPath of pluginsToRebuild) {
          const plugin = this.fileManager.getPluginByPath(pluginPath);
          if (plugin) {
            plugins.push(plugin);
          }
        }

        if (plugins.length > 0) {
          // Build the changed plugins sequentially
          for (const plugin of plugins) {
            await this.buildSinglePlugin(plugin);
          }

          // Log completion
          const totalTime = (
            (performance.now() - this.startTime) /
            1000
          ).toFixed(2);
          const successCount = Array.from(this.pluginResults.values()).filter(
            (r) => r.success
          ).length;
          const failureCount = this.pluginResults.size - successCount;

          this.log('info', chalk.bold(`Rebuild completed in ${totalTime}s`));
          this.log('info', chalk.green.bold(`✓ Success: ${successCount}`));

          if (failureCount > 0) {
            this.log('info', chalk.red.bold(`✗ Failed: ${failureCount}`));
          }

          // Reload plugins
          if (successCount > 0) {
            for (const plugin of plugins) {
              const result = await this.buildManager.reloadPlugin(
                plugin.pluginName
              );
              if (result.success) {
                this.log(
                  'info',
                  chalk.green(`✓ Reloaded plugin: ${plugin.pluginName}`)
                );
              } else {
                this.log(
                  'warn',
                  chalk.yellow(
                    `⚠ Failed to reload plugin: ${plugin.pluginName} - ${result.message}`
                  )
                );
              }
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.log('error', chalk.red(`Error during rebuild: ${errorMessage}`));
      } finally {
        isBuilding = false;
        // Check if more items were added to the queue while we were building
        if (rebuildQueue.size > 0) {
          process.nextTick(processRebuildQueue);
        }
      }
    };

    // File change handler
    const handleFileChange = (filePath: string, eventType: string) => {
      // Convert to absolute path if it's not already
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      // Find which plugin this file belongs to
      const plugin = this.findPluginForPath(absolutePath);

      if (plugin) {
        this.log(
          'info',
          chalk.blue(`File ${eventType}: `) +
            chalk.cyan(path.relative(process.cwd(), absolutePath))
        );

        // Add the plugin to the rebuild queue
        rebuildQueue.add(plugin.fullPath);

        // Debounce rebuilds to avoid rapid consecutive builds
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          processRebuildQueue();
          debounceTimer = null;
        }, 300);
      }
    };

    // Set up event handlers
    this.watcher
      .on('add', (filePath) => handleFileChange(filePath, 'added'))
      .on('change', (filePath) => handleFileChange(filePath, 'changed'))
      .on('unlink', (filePath) => handleFileChange(filePath, 'deleted'));
  }

  /**
   * Find which plugin a file belongs to
   */
  private findPluginForPath(filePath: string): Plugin | undefined {
    const plugins = this.fileManager.getAllPlugins();

    // Find the plugin with the longest matching path prefix
    let bestMatch: Plugin | undefined;
    let bestMatchLength = 0;

    for (const plugin of plugins) {
      if (
        filePath.startsWith(plugin.fullPath) &&
        plugin.fullPath.length > bestMatchLength
      ) {
        bestMatch = plugin;
        bestMatchLength = plugin.fullPath.length;
      }
    }

    return bestMatch;
  }

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      this.log('info', 'Stopping watch mode...');
      await this.watcher.close();
      this.watcher = null;
      this.log('info', 'Watch mode stopped');
    }
  }

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
      case '--watch':
      case '-w':
        options.watch = true;
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
Plugin Builder - Build plugins sequentially

Usage: ts-node build.ts [options]

Options:
  --plugins-dir, -p <dir>  Path to plugins directory (default: src/plugins)
  --dist-dir, -d <dir>     Path to distribution directory (default: dist)
  --no-clean               Don't clean the dist directory before building
  --log-level, -l <level>  Log level: verbose, info, warn, error (default: info)
  --stop-on-error          Stop building if a plugin fails
  --watch, -w              Watch for changes and rebuild automatically
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

    // If not in watch mode, exit with appropriate code
    if (!options.watch) {
      process.exit(success ? 0 : 1);
    } else {
      // In watch mode, handle process termination
      process.on('SIGINT', async () => {
        console.log('\nReceived SIGINT, shutting down...');
        await builder.stopWatching();
        process.exit(0);
      });
    }
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
