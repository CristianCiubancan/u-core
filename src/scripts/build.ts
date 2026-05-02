import 'dotenv/config';
import { FileManager } from './managers/FileManager.js';
import { BuildManager } from './managers/BuildManager.js';
import { Plugin } from './types/Plugin.js';
import { Logger, createLogger } from './Logger.js';
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

  /**
   * Whether to produce a production build: minify TS/JS bundles, switch
   * sourcemaps to external `.map` siblings (server only — client bundles
   * never get sourcemaps), and tell Vite to build in production mode.
   * Auto-detected from `NODE_ENV=production` if the CLI flag isn't set.
   * @default false
   */
  production: boolean;
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
  private logger: Logger;

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
      production:
        options.production !== undefined
          ? options.production
          : process.env.NODE_ENV === 'production',
    };

    this.logger = createLogger({ level: this.options.logLevel });
    this.fileManager = new FileManager(
      this.options.pluginsDir,
      createLogger({ level: this.options.logLevel, prefix: 'FileManager' })
    );
    this.buildManager = new BuildManager(
      this.fileManager,
      this.options.distDir,
      createLogger({ level: this.options.logLevel, prefix: 'BuildManager' }),
      { production: this.options.production }
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
        chalk.bold(`Building ${plugins.length} plugins in parallel`)
      );

      // Clean dist directory if requested; otherwise sweep orphaned outputs
      // left behind by renamed/deleted plugins or crashed prior builds. Without
      // a sweep, `--no-clean` lets stale outputs accumulate forever (R-34).
      if (this.options.clean) {
        this.log('info', 'Cleaning distribution directory...');
        await this.buildManager.clean();
        this.log('info', chalk.green('✓') + ' Distribution directory cleaned');
      } else {
        this.log('info', 'Sweeping orphaned outputs (--no-clean mode)...');
        await this.buildManager.sweepOrphans();
      }

      // Build plugins in parallel. PR-09 eliminated the src/webview/App.tsx
      // swap, so cross-plugin webview builds no longer race for the same
      // shared file and can run concurrently.
      await Promise.all(plugins.map((plugin) => this.buildSinglePlugin(plugin)));

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
   * Start watching for file changes. The watcher handles:
   *
   *   - File-kind routing — TS/JS-only edits skip the Vite cold-start and
   *     trigger a partial rebuild; only changes to `Page.tsx` or anything
   *     under `html/` re-run Vite.
   *   - Manifest reload — a `plugin.json` change runs
   *     `fileManager.reloadPlugin(...)` before rebuilding so the manifest
   *     globs (and consequently the entry set) are fresh.
   *   - New plugin detection — adding a `plugin.json` that doesn't match
   *     a registered plugin triggers `fileManager.refresh()` and an
   *     in-process build, no watcher restart required.
   *   - Deletion / rename — `unlink` and `unlinkDir` re-scan the plugin's
   *     file tree (via `reloadPlugin`) and the next transactional build
   *     swap removes the stale dist output for the deleted source.
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

    // Per-plugin queued intent — what kinds of work the next rebuild must
    // do. `viteRebuild` is the file-kind routing flag; `manifestReload` is
    // set when `plugin.json` changes; `pluginsRefresh` is a sentinel for
    // "this was a brand-new plugin, the entire registry needs to refresh".
    interface RebuildIntent {
      pluginPath: string;
      viteRebuild: boolean;
      manifestReload: boolean;
    }
    const rebuildQueue = new Map<string, RebuildIntent>();
    let pluginsRefreshNeeded = false;
    let isBuilding = false;
    let debounceTimer: NodeJS.Timeout | null = null;

    const processRebuildQueue = async () => {
      if (isBuilding || (rebuildQueue.size === 0 && !pluginsRefreshNeeded))
        return;

      isBuilding = true;

      try {
        // If a brand-new plugin.json appeared, re-scan the whole registry
        // before figuring out what to build. The `add` handler queues the
        // plugin path optimistically; the refresh either confirms it (the
        // path is now a registered plugin) or drops it (the user deleted
        // the file before the debounce window closed).
        if (pluginsRefreshNeeded) {
          this.log('info', chalk.cyan('New plugin.json detected — refreshing plugin registry'));
          await this.fileManager.refresh();
          pluginsRefreshNeeded = false;
        }

        const intents = Array.from(rebuildQueue.values());
        rebuildQueue.clear();

        this.log(
          'info',
          chalk.bold(`Rebuilding ${intents.length} changed plugin(s)...`)
        );

        this.pluginResults.clear();
        this.startTime = performance.now();

        const plugins: Plugin[] = [];
        const intentByPlugin = new Map<string, RebuildIntent>();
        for (const intent of intents) {
          // After `refresh()`, the prior `Plugin` object is stale; look up
          // the current one from the path registry.
          const plugin = this.fileManager.getPluginByPath(intent.pluginPath);
          if (!plugin) {
            this.log(
              'warn',
              chalk.yellow(
                `Skipping rebuild: no plugin registered at ${intent.pluginPath}`
              )
            );
            continue;
          }
          plugins.push(plugin);
          intentByPlugin.set(plugin.pluginName, intent);

          // Manifest changes: reload the plugin's manifest + file tree
          // before any build step reads them. Without this the rebuild
          // would emit an `fxmanifest.lua` derived from the previous
          // (cached) `plugin.json`.
          if (intent.manifestReload) {
            try {
              await this.fileManager.reloadPlugin(plugin.fullPath);
              this.log(
                'verbose',
                `Reloaded manifest for ${plugin.pluginName} before rebuild`
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              this.log(
                'warn',
                chalk.yellow(
                  `Manifest reload failed for ${plugin.pluginName}: ${msg}`
                )
              );
            }
          }
        }

        if (plugins.length > 0) {
          for (const plugin of plugins) {
            const intent = intentByPlugin.get(plugin.pluginName);
            await this.buildSinglePlugin(plugin, {
              skipVite: !(intent?.viteRebuild ?? true),
            });
          }

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
        if (rebuildQueue.size > 0 || pluginsRefreshNeeded) {
          process.nextTick(processRebuildQueue);
        }
      }
    };

    /**
     * Classify a changed file path into a rebuild kind. The Vite step is
     * the slowest part of a rebuild, so a TS/JS-only edit gets a fast
     * path that copies the previous Vite output forward instead of
     * re-running the bundler.
     */
    const classify = (
      pluginRoot: string,
      absolutePath: string
    ): { isManifest: boolean; needsVite: boolean } => {
      const rel = path
        .relative(pluginRoot, absolutePath)
        .replace(/\\/g, '/');
      if (rel === 'plugin.json') return { isManifest: true, needsVite: true };
      // Anything under html/ (Page.tsx, html assets, fonts, images, css)
      // can affect the webview bundle, so re-run Vite.
      if (rel.startsWith('html/')) return { isManifest: false, needsVite: true };
      return { isManifest: false, needsVite: false };
    };

    const queueRebuild = (
      plugin: Plugin,
      classification: { isManifest: boolean; needsVite: boolean }
    ) => {
      const existing = rebuildQueue.get(plugin.fullPath) ?? {
        pluginPath: plugin.fullPath,
        viteRebuild: false,
        manifestReload: false,
      };
      existing.viteRebuild = existing.viteRebuild || classification.needsVite;
      existing.manifestReload =
        existing.manifestReload || classification.isManifest;
      rebuildQueue.set(plugin.fullPath, existing);

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        processRebuildQueue();
        debounceTimer = null;
      }, 300);
    };

    const handleFileChange = (filePath: string, eventType: string) => {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      const plugin = this.findPluginForPath(absolutePath);

      // New `plugin.json` at a path that no registered plugin owns:
      // schedule a registry refresh and queue the prospective plugin
      // path. After the refresh the path lookup will resolve.
      if (!plugin && path.basename(absolutePath) === 'plugin.json') {
        this.log(
          'info',
          chalk.blue(`Plugin manifest ${eventType}: `) +
            chalk.cyan(path.relative(process.cwd(), absolutePath))
        );
        pluginsRefreshNeeded = true;
        const prospectivePluginRoot = path.dirname(absolutePath);
        rebuildQueue.set(prospectivePluginRoot, {
          pluginPath: prospectivePluginRoot,
          viteRebuild: true,
          manifestReload: true,
        });
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          processRebuildQueue();
          debounceTimer = null;
        }, 300);
        return;
      }

      if (plugin) {
        this.log(
          'info',
          chalk.blue(`File ${eventType}: `) +
            chalk.cyan(path.relative(process.cwd(), absolutePath))
        );
        const classification = classify(plugin.fullPath, absolutePath);
        queueRebuild(plugin, classification);
      }
    };

    // Set up event handlers. `unlink` (file delete) and `unlinkDir`
    // (folder delete) both flow through the same handler — the next
    // build's `reloadPlugin` re-scans the plugin tree and the
    // transactional swap removes any dist artifact whose source no
    // longer exists.
    this.watcher
      .on('add', (filePath) => handleFileChange(filePath, 'added'))
      .on('change', (filePath) => handleFileChange(filePath, 'changed'))
      .on('unlink', (filePath) => handleFileChange(filePath, 'deleted'))
      .on('unlinkDir', (filePath) => handleFileChange(filePath, 'deleted'));
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
   * Stop watching for file changes. Disposes the BuildManager's cached
   * esbuild contexts so the worker pool exits cleanly — without this,
   * `pnpm dev` lingered after `SIGINT` until the worker timed out.
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      this.log('info', 'Stopping watch mode...');
      await this.watcher.close();
      this.watcher = null;
      this.log('info', 'Watch mode stopped');
    }
    await this.buildManager.dispose();
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
  private async buildSinglePlugin(
    plugin: Plugin,
    options: { skipVite?: boolean } = {}
  ): Promise<void> {
    const pluginStartTime = performance.now();

    try {
      // Log current plugin build
      this.log('info', chalk.cyan(`🔨 Building plugin: ${plugin.pluginName}`));

      // Build the plugin
      await this.buildManager.buildPlugin(plugin.pluginName, false, options);

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
      case '--prod':
      case '--production':
        options.production = true;
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

Usage: tsx build.ts [options]

Options:
  --plugins-dir, -p <dir>  Path to plugins directory (default: src/plugins)
  --dist-dir, -d <dir>     Path to distribution directory (default: dist)
  --no-clean               Don't clean the dist directory before building
  --log-level, -l <level>  Log level: verbose, info, warn, error (default: info)
  --stop-on-error          Stop building if a plugin fails
  --watch, -w              Watch for changes and rebuild automatically
  --prod, --production     Production build: minify TS/JS, external sourcemaps
  --help, -h               Show this help message
`);
}

/**
 * Refuse to start when SERVER_NAME is missing or still set to the
 * `<replace-me>` placeholder. The dist directory path embeds SERVER_NAME, so
 * a missing value silently writes resources to `txData/undefined/...` and
 * an unreplaced placeholder writes to `txData/<replace-me>/...` — neither
 * is what the operator wanted.
 */
function assertServerName(): void {
  const serverName = process.env.SERVER_NAME;
  if (!serverName || serverName === '<replace-me>') {
    const reason = !serverName
      ? 'unset or empty'
      : 'still set to the "<replace-me>" placeholder';
    console.error(
      `[build] SERVER_NAME is ${reason}. Set SERVER_NAME in .env to your ` +
        `FXServer instance directory (e.g. CFXDefaultFiveM_xxxxxx.base).`
    );
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    assertServerName();

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
