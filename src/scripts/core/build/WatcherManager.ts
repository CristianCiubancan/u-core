/**
 * Watcher manager
 */
import 'dotenv/config'; // Load environment variables from .env file
import * as path from 'path';
import * as chokidar from 'chokidar';
import lodashDebounce from 'lodash.debounce';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { Logger, Watcher } from '../types.js';

/**
 * Debounced task manager
 */
export class DebouncedTaskManager {
  private tasks: Map<string, () => Promise<void>>;
  private debounceTime: number;

  /**
   * Create a new debounced task manager
   * @param debounceTime Debounce time in milliseconds
   */
  constructor(debounceTime = 1000) {
    this.tasks = new Map();
    this.debounceTime = debounceTime;
  }

  /**
   * Execute a task
   * @param key Task key
   * @param task Task to execute
   */
  execute(key: string, task: () => Promise<void>): void {
    // Create a debounced version of the task if it doesn't exist
    if (!this.tasks.has(key)) {
      const debouncedFunction = lodashDebounce(async () => {
        try {
          await task();
        } catch (error) {
          console.error(`Error executing task ${key}:`, error);
        }
      }, this.debounceTime);

      // Create a wrapper function that returns a Promise
      const wrappedFunction = async () => {
        return new Promise<void>((resolve) => {
          debouncedFunction();
          resolve();
        });
      };

      this.tasks.set(key, wrappedFunction);
    }

    // Execute the debounced task
    const debouncedTask = this.tasks.get(key);
    if (debouncedTask) {
      debouncedTask();
    }
  }
}

/**
 * Watcher manager implementation
 */
export class WatcherManagerImpl implements Watcher {
  private logger: Logger;
  private debouncedTaskManager: DebouncedTaskManager;
  private watchers: chokidar.FSWatcher[] = [];

  /**
   * Create a new watcher manager
   * @param logger Logger
   * @param debouncedTaskManager Debounced task manager
   */
  constructor(
    logger: Logger,
    debouncedTaskManager: DebouncedTaskManager = new DebouncedTaskManager()
  ) {
    this.logger = logger;
    this.debouncedTaskManager = debouncedTaskManager;
  }

  /**
   * Watch paths for changes
   * @param paths Paths to watch
   * @param onChange Callback to execute when a file changes
   */
  watch(paths: string[], onChange: (path: string) => void): void {
    this.logger.debug(`Setting up watcher for paths: ${paths.join(', ')}`);

    try {
      // Create a watcher with ignored patterns
      const watcher = chokidar.watch(paths, {
        persistent: true,
        ignoreInitial: true,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          // Ignore the src/webview directory completely - we only want to watch plugin files
          '**/src/webview/**',
        ],
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
        // Add these options to improve handling of special characters in paths
        usePolling: false,
        alwaysStat: true,
      });

      // Set up event handlers
      watcher
        .on('ready', () => {
          this.logger.info(`Watcher ready for paths: ${paths.join(', ')}`);
        })
        .on('all', (event, filePath) => {
          this.logger.debug(`File event: ${event} ${filePath}`);

          // Only respond to changes in relevant file types
          if (!/\.(ts|json|lua|tsx|jsx|css|html)$/.test(filePath)) {
            this.logger.debug(`Ignoring non-source file: ${filePath}`);
            return;
          }

          // Add more detailed logging
          this.logger.info(`Processing file change: ${event} ${filePath}`);

          // Execute the callback
          this.debouncedTaskManager.execute(filePath, async () => {
            onChange(filePath);
          });
        });

      // Store the watcher
      this.watchers.push(watcher);
    } catch (error) {
      this.logger.error(`Error setting up watcher:`, error);
      throw error;
    }
  }

  /**
   * Stop all watchers
   */
  stop(): void {
    this.logger.debug('Stopping all watchers');

    for (const watcher of this.watchers) {
      watcher.close();
    }

    this.watchers = [];
  }

  /**
   * Set up plugin watchers
   * @param pluginsDir Plugins directory
   * @param distDir Distribution directory
   * @param rebuildComponent Function to rebuild a component
   */
  setupPluginWatchers(
    pluginsDir: string,
    distDir: string,
    rebuildComponent: (
      componentType: 'plugin' | 'core' | 'webview',
      pluginDir?: string
    ) => Promise<void>
  ): void {
    this.logger.debug(`Setting up plugin watchers for ${pluginsDir}`);

    try {
      // Watch the plugins directory
      this.watch([pluginsDir], (filePath) => {
        // Get the plugin directory
        const pluginDir = this.getPluginDirFromFilePath(filePath, pluginsDir);

        if (pluginDir) {
          this.logger.debug(
            `File changed in plugin ${path.basename(pluginDir)}: ${filePath}`
          );

          // Rebuild the plugin
          this.debouncedTaskManager.execute(pluginDir, async () => {
            await rebuildComponent('plugin', pluginDir);
          });
        }
      });
    } catch (error) {
      this.logger.error(`Error setting up plugin watchers:`, error);
      throw error;
    }
  }

  /**
   * Set up core watcher
   * @param coreDir Core directory
   * @param distDir Distribution directory
   * @param rebuildComponent Function to rebuild a component
   */
  setupCoreWatcher(
    coreDir: string,
    distDir: string,
    rebuildComponent: (
      componentType: 'plugin' | 'core' | 'webview',
      pluginDir?: string
    ) => Promise<void>
  ): void {
    this.logger.debug(`Setting up core watcher for ${coreDir}`);

    try {
      // Watch the core directory
      this.watch([coreDir], (filePath) => {
        this.logger.debug(`File changed in core: ${filePath}`);

        // Rebuild the core
        this.debouncedTaskManager.execute('core', async () => {
          await rebuildComponent('core');
        });
      });
    } catch (error) {
      this.logger.error(`Error setting up core watcher:`, error);
      throw error;
    }
  }

  /**
   * Set up webview watcher
   * @param pluginsDir Plugins directory
   * @param distDir Distribution directory
   * @param rebuildComponent Function to rebuild a component
   */
  setupWebviewWatcher(
    pluginsDir: string,
    distDir: string,
    rebuildComponent: (
      componentType: 'plugin' | 'core' | 'webview',
      pluginDir?: string
    ) => Promise<void>
  ): void {
    this.logger.debug(
      `Setting up simplified webview watcher for ${pluginsDir}`
    );

    try {
      // Import the buildWebview function directly
      import('../../utils/webview.js')
        .then(({ buildWebview }) => {
          // Watch for all .tsx files in the plugins directory
          const tsxPattern = path.join(pluginsDir, '**', '*.tsx');
          this.logger.info(
            `Setting up watcher for TSX files with pattern: ${tsxPattern}`
          );

          this.watch([tsxPattern], (filePath) => {
            this.logger.info(`TSX file changed: ${filePath}`);

            // Get the plugin directory containing this file
            const pluginDir = this.getPluginDirFromFilePath(
              filePath,
              pluginsDir
            );
            if (!pluginDir) {
              this.logger.warn(
                `Could not determine plugin directory for ${filePath}`
              );
              return;
            }

            // Check if this is a Page.tsx file
            const isPageTsx =
              filePath.includes('html') &&
              path.basename(filePath) === 'Page.tsx';

            if (isPageTsx) {
              this.logger.info(`=== PAGE.TSX FILE CHANGED: ${filePath} ===`);
              this.logger.info(
                `This should trigger a complete webview rebuild`
              );
            }

            // Use a specific debounce key for this plugin
            const debounceKey = `webview-${pluginDir}-${
              isPageTsx ? 'page' : 'tsx'
            }`;

            this.debouncedTaskManager.execute(debounceKey, async () => {
              try {
                // First rebuild the plugin to ensure all assets are up to date
                this.logger.info(
                  `Rebuilding plugin ${pluginDir} due to TSX file change`
                );
                await rebuildComponent('plugin', pluginDir);

                // If this is a Page.tsx file, also rebuild the webview
                if (isPageTsx) {
                  this.logger.info(
                    `=== EXPLICITLY TRIGGERING WEBVIEW REBUILD FOR PAGE.TSX CHANGE ===`
                  );
                  this.logger.info(
                    `Rebuilding webview after plugin ${pluginDir} rebuild for Page.tsx`
                  );

                  // Force a small delay to ensure the plugin rebuild is complete
                  await new Promise((resolve) => setTimeout(resolve, 500));

                  try {
                    // First try the standard rebuildComponent approach
                    await rebuildComponent('webview', undefined);

                    // Then also try the direct buildWebview approach as a fallback
                    this.logger.info(
                      `=== ALSO TRIGGERING DIRECT WEBVIEW BUILD ===`
                    );

                    // Get all plugins with webview content
                    const { getPluginsPaths, parsePluginPathsIntoPlugins } =
                      await import('../../utils/file.js');
                    const { pluginPaths } = getPluginsPaths(pluginsDir);
                    const plugins = parsePluginPathsIntoPlugins(pluginPaths);

                    // Filter plugins with webview content
                    const webviewPlugins = [];
                    for (const plugin of plugins) {
                      if (plugin.hasHtml) {
                        webviewPlugins.push(plugin);
                      }
                    }

                    // Directly call buildWebview
                    await buildWebview(webviewPlugins, distDir);

                    this.logger.info(`=== DIRECT WEBVIEW BUILD COMPLETED ===`);
                  } catch (webviewError) {
                    this.logger.error(
                      `Error in direct webview build:`,
                      webviewError
                    );
                  }

                  this.logger.info(`=== WEBVIEW REBUILD COMPLETED ===`);
                }
              } catch (error) {
                this.logger.error(
                  `Error rebuilding after TSX file change in ${pluginDir}:`,
                  error
                );
              }
            });
          });
        })
        .catch((error) => {
          this.logger.error(`Error importing webview utils:`, error);
        });
    } catch (error) {
      this.logger.error(`Error setting up webview watcher:`, error);
      throw error;
    }
  }

  /**
   * Get plugin directory from file path
   * @param filePath File path
   * @param pluginsDir Plugins directory
   * @returns Plugin directory
   */
  private getPluginDirFromFilePath(
    filePath: string,
    pluginsDir: string
  ): string | null {
    // Normalize paths
    const normalizedFilePath = path.normalize(filePath);
    const normalizedPluginsDir = path.normalize(pluginsDir);

    // Check if the file is in the plugins directory
    if (!normalizedFilePath.startsWith(normalizedPluginsDir)) {
      return null;
    }

    // Get the relative path from the plugins directory
    const relativePath = path.relative(
      normalizedPluginsDir,
      normalizedFilePath
    );

    // Get the first directory in the relative path
    const parts = relativePath.split(path.sep);

    if (parts.length === 0) {
      return null;
    }

    // Return the plugin directory
    return path.join(normalizedPluginsDir, parts[0]);
  }
}
