/**
 * Unified Watcher Manager
 * Handles file watching and triggering rebuilds
 */
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { DebouncedTaskManager } from './DebouncedTaskManager.js';
import { ResourceManager } from './ResourceManager.js';
import { findPluginPaths, rebuildComponent } from './index.js';
import { Logger, Watcher } from '../../core/types.js';
import { ConsoleLogger, LogLevel } from '../logger/ConsoleLogger.js';

/**
 * Watcher options
 */
export interface WatcherOptions {
  /** Whether to ignore initial scan */
  ignoreInitial?: boolean;
  /** Patterns to ignore */
  ignored?: string[];
  /** Whether to keep the process running */
  persistent?: boolean;
  /** Whether to use polling */
  usePolling?: boolean;
  /** Polling interval in milliseconds */
  interval?: number;
  /** Maximum directory depth */
  depth?: number;
  /** Whether to await write finish */
  awaitWriteFinish?:
    | boolean
    | { stabilityThreshold?: number; pollInterval?: number };
}

/**
 * Default watcher options
 */
const DEFAULT_WATCHER_OPTIONS: WatcherOptions = {
  ignoreInitial: true,
  ignored: ['**/node_modules/**', '**/.git/**'],
  persistent: true,
  usePolling: true,
  interval: 1000,
  depth: 99,
};

/**
 * Unified Watcher Manager
 * Implements both the simple and advanced watcher functionality
 */
export class WatcherManager implements Watcher {
  private logger: Logger;
  private debouncedTaskManager: DebouncedTaskManager;
  private resourceManager: ResourceManager;
  private watchers: chokidar.FSWatcher[] = [];
  private watcherOptions: WatcherOptions;

  /**
   * Create a new watcher manager
   * @param debouncedTaskManager Debounced task manager
   * @param resourceManager Resource manager
   * @param logger Logger
   * @param options Watcher options
   */
  constructor(
    debouncedTaskManager: DebouncedTaskManager = new DebouncedTaskManager(),
    resourceManager: ResourceManager = new ResourceManager(),
    logger: Logger = new ConsoleLogger({ minLevel: LogLevel.Info }),
    options: WatcherOptions = {}
  ) {
    this.debouncedTaskManager = debouncedTaskManager;
    this.resourceManager = resourceManager;
    this.logger = logger;
    this.watcherOptions = { ...DEFAULT_WATCHER_OPTIONS, ...options };

    // Initialize the ResourceManager with the generated directory
    const generatedDir = this.getGeneratedDir();
    if (generatedDir) {
      // We're using the same ResourceManager instance, but we want to make sure
      // it has the generatedDir property set correctly
      Object.defineProperty(this.resourceManager, 'generatedDir', {
        value: generatedDir,
        writable: false,
      });
    }
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
        persistent: this.watcherOptions.persistent,
        ignoreInitial: this.watcherOptions.ignoreInitial,
        ignored: this.watcherOptions.ignored,
        usePolling: this.watcherOptions.usePolling,
        interval: this.watcherOptions.interval,
        depth: this.watcherOptions.depth,
        awaitWriteFinish: this.watcherOptions.awaitWriteFinish,
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
   * Set up watcher for a directory with consistent options
   */
  setupDirectoryWatcher(
    dir: string,
    description: string,
    ignoredPaths: string[],
    filePattern: RegExp,
    onChange: (filePath: string) => void
  ): void {
    this.logger.info(`Setting up watcher for ${description}: ${dir}`);

    const options = {
      ...this.watcherOptions,
      ignored: [...(this.watcherOptions.ignored || []), ...ignoredPaths],
    };

    try {
      const watcher = chokidar
        .watch(dir, options)
        .on('ready', () => {
          this.logger.info(`Watcher ready for ${description}: ${dir}`);
        })
        .on('all', (event, filePath) => {
          this.logger.debug(`File event in ${description}:`, event, filePath);

          // Only respond to changes in relevant file types
          if (!filePattern.test(filePath)) {
            this.logger.debug(`Ignoring non-source file: ${filePath}`);
            return;
          }

          if (global.isBuilding) {
            this.logger.debug('Build already in progress, skipping');
            return;
          }

          onChange(filePath);
        });

      // Store the watcher
      this.watchers.push(watcher);
    } catch (error) {
      this.logger.error(`Error setting up watcher for ${description}:`, error);
    }
  }

  /**
   * Set up watchers for plugins
   */
  setupPluginWatchers(
    pluginsDir: string,
    distDir: string,
    rebuildComponent: (
      componentType: 'plugin' | 'core' | 'webview',
      pluginDir?: string
    ) => Promise<void> | void
  ): void {
    this.logger.debug(`Setting up plugin watchers for ${pluginsDir}`);

    try {
      // Method 1: Watch each plugin directory individually
      const pluginPaths = findPluginPaths(pluginsDir);
      const outputPaths = [distDir];

      // Set up individual plugin watchers
      for (const pluginDir of pluginPaths) {
        const normalizedPluginDir = path.normalize(pluginDir);

        this.setupDirectoryWatcher(
          normalizedPluginDir,
          `plugin ${path.basename(normalizedPluginDir)}`,
          outputPaths,
          /\.(ts|json|lua|tsx|jsx|css|html)$/,
          () => {
            this.debouncedTaskManager.execute(normalizedPluginDir, () =>
              rebuildComponent('plugin', normalizedPluginDir)
            );
          }
        );
      }

      // Method 2: Watch the entire plugins directory
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
    }
  }

  /**
   * Set up watcher for core
   */
  setupCoreWatcher(
    coreDir: string,
    distDir: string,
    rebuildComponent: (
      componentType: 'plugin' | 'core' | 'webview',
      pluginDir?: string
    ) => Promise<void> | void
  ): void {
    this.logger.debug(`Setting up core watcher for ${coreDir}`);

    try {
      // Method 1: Use setupDirectoryWatcher
      this.setupDirectoryWatcher(
        coreDir,
        'core',
        [distDir],
        /\.(ts|json|lua)$/,
        () => {
          this.debouncedTaskManager.execute('core', () =>
            rebuildComponent('core')
          );
        }
      );

      // Method 2: Use watch
      this.watch([coreDir], (filePath) => {
        this.logger.debug(`File changed in core: ${filePath}`);

        // Rebuild the core
        this.debouncedTaskManager.execute('core', async () => {
          await rebuildComponent('core');
        });
      });
    } catch (error) {
      this.logger.error(`Error setting up core watcher:`, error);
    }
  }

  /**
   * Set up watcher for webview files
   */
  setupWebviewWatcher(
    pluginsDir: string,
    distDir: string,
    rebuildComponent: (
      componentType: 'plugin' | 'core' | 'webview',
      pluginDir?: string
    ) => Promise<void> | void
  ): void {
    this.logger.debug(`Setting up webview watcher for ${pluginsDir}`);

    try {
      // Method 1: Watch for changes in html/Page.tsx files
      this.setupDirectoryWatcher(
        pluginsDir,
        'webview files',
        [distDir],
        /html\/Page\.tsx$/,
        (filePath) => {
          this.logger.info(`Webview file changed: ${filePath}`);
          // Get the plugin directory containing this file
          const pluginDir = path.dirname(path.dirname(filePath));
          this.debouncedTaskManager.execute(`webview-${pluginDir}`, () =>
            rebuildComponent('plugin', pluginDir)
          );
        }
      );

      // Method 2: Watch for all .tsx files in the plugins directory
      const tsxPattern = path.join(pluginsDir, '**', '*.tsx');
      this.logger.info(
        `Setting up watcher for TSX files with pattern: ${tsxPattern}`
      );

      this.watch([tsxPattern], (filePath) => {
        this.logger.info(`TSX file changed: ${filePath}`);

        // Get the plugin directory containing this file
        const pluginDir = this.getPluginDirFromFilePath(filePath, pluginsDir);
        if (!pluginDir) {
          this.logger.warn(
            `Could not determine plugin directory for ${filePath}`
          );
          return;
        }

        // Check if this is a Page.tsx file
        const isPageTsx =
          filePath.includes('html') && path.basename(filePath) === 'Page.tsx';

        if (isPageTsx) {
          this.logger.info(`=== PAGE.TSX FILE CHANGED: ${filePath} ===`);
          this.logger.info(`This should trigger a complete webview rebuild`);
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
                // Rebuild the webview
                await rebuildComponent('webview', undefined);
              } catch (webviewError) {
                this.logger.error(`Error in webview rebuild:`, webviewError);
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
    } catch (error) {
      this.logger.error(`Error setting up webview watcher:`, error);
    }
  }

  /**
   * Set up watcher for dist directory to track changes but not restart resources
   */
  setupDistWatcher(distDir: string): void {
    this.setupDirectoryWatcher(
      distDir,
      'dist',
      [path.join(distDir, 'scripts', '**')],
      /.*/, // Match all files
      (filePath) => {
        // Get the relative path from the dist directory
        const relativePath = path.relative(distDir, filePath);
        const pathParts = relativePath.split(path.sep);

        // Skip if this is in the scripts directory
        if (pathParts[0] === 'scripts') {
          return;
        }

        // Common subdirectories that aren't resources
        const commonSubdirs = [
          'client',
          'server',
          'shared',
          'html',
          'translations',
          'assets',
        ];

        // Try to determine the resource name
        let resourceName = null;
        let manifestFound = false;
        let resourcePath = '';

        // First, try to find a manifest file by walking up the directory tree
        for (let i = 0; i < pathParts.length - 1; i++) {
          // Build the path incrementally
          resourcePath = path.join(resourcePath, pathParts[i]);
          const fullResourcePath = path.join(distDir, resourcePath);
          const manifestPath = path.join(fullResourcePath, 'fxmanifest.lua');

          if (fs.existsSync(manifestPath)) {
            // Found a manifest, this is a resource
            resourceName = path.basename(resourcePath);
            manifestFound = true;
            this.logger.debug(`Found resource with manifest: ${resourceName}`);
            break;
          }
        }

        // If we didn't find a manifest, try to determine the resource name from the path
        if (!manifestFound) {
          // Check if the file is in a common subdirectory
          if (
            pathParts.length >= 2 &&
            commonSubdirs.includes(pathParts[pathParts.length - 2])
          ) {
            // Find the last directory that's not a common subdirectory and not in brackets
            let foundResource = false;

            // Start from the end and work backwards to find the resource name
            for (let i = pathParts.length - 3; i >= 0; i--) {
              if (
                !commonSubdirs.includes(pathParts[i]) &&
                !pathParts[i].startsWith('[') &&
                !pathParts[i].endsWith(']')
              ) {
                resourceName = pathParts[i];
                foundResource = true;
                this.logger.debug(
                  `Found resource from path structure: ${resourceName}`
                );
                break;
              }
            }

            // If we still didn't find a resource name, use the first part of the path
            if (!foundResource && pathParts.length > 0) {
              resourceName = pathParts[0];
              this.logger.debug(
                `Using first path part as resource name: ${resourceName}`
              );
            }
          } else if (pathParts.length > 0) {
            // Use the first part of the path
            resourceName = pathParts[0];
            this.logger.debug(
              `Using first path part as resource name: ${resourceName}`
            );
          }
        }

        // Log the detected resource but don't restart it
        // Resource reloading is handled by the generated folder watcher
        if (resourceName && resourceName !== 'scripts') {
          this.logger.info(
            `Resource change detected in dist: ${resourceName} (not restarting)`
          );
        }
      }
    );
  }

  /**
   * Get the path to the generated resources directory
   */
  private getGeneratedDir(): string | null {
    if (!process.env.SERVER_NAME) {
      this.logger.error(
        'SERVER_NAME environment variable is not set. Cannot determine generated directory.'
      );
      return null;
    }

    const generatedDirName = '[GENERATED]';
    const destinationBase = path.join(
      'txData',
      process.env.SERVER_NAME,
      'resources'
    );
    return path.join(destinationBase, generatedDirName);
  }

  /**
   * Set up watcher for generated resources folder
   * This is the ONLY place that should trigger resource reloads
   */
  setupGeneratedFolderWatcher(): void {
    const generatedDir = this.getGeneratedDir();
    if (!generatedDir) {
      return;
    }

    this.logger.info(
      `Setting up watcher for generated resources: ${generatedDir}`
    );

    this.setupDirectoryWatcher(
      generatedDir,
      'generated resources',
      [],
      /.*/, // Match all files
      (filePath) => {
        // Skip webview and scripts directories
        if (
          filePath.includes('/webview/') ||
          filePath.includes('\\webview\\') ||
          filePath.includes('/scripts/') ||
          filePath.includes('\\scripts\\')
        ) {
          return;
        }

        try {
          // Find the actual resource by looking for the manifest file
          let currentDir = path.dirname(filePath);
          let resourceName = null;
          let manifestFound = false;

          // Common subdirectories that aren't resources
          const commonSubdirs = [
            'client',
            'server',
            'shared',
            'html',
            'translations',
            'assets',
          ];

          // Check if the current directory is a common subdirectory
          const dirName = path.basename(currentDir);
          if (commonSubdirs.includes(dirName)) {
            // Move up one level if we're in a common subdirectory
            currentDir = path.dirname(currentDir);
          }

          // Check for manifest file
          const manifestPath = path.join(currentDir, 'fxmanifest.lua');
          if (fs.existsSync(manifestPath)) {
            resourceName = path.basename(currentDir);
            manifestFound = true;
          }

          // If we didn't find a manifest, walk up the directory tree
          if (!manifestFound) {
            // Get the relative path from the generated directory
            const relativePath = path.relative(generatedDir, filePath);
            const pathParts = relativePath.split(path.sep);

            // First, try to find a manifest file by walking up the directory tree
            let resourcePath = '';
            for (let i = 0; i < pathParts.length - 1; i++) {
              // Build the path incrementally
              resourcePath = path.join(resourcePath, pathParts[i]);
              const fullResourcePath = path.join(generatedDir, resourcePath);
              const manifestPath = path.join(
                fullResourcePath,
                'fxmanifest.lua'
              );

              if (fs.existsSync(manifestPath)) {
                // Found a manifest, this is a resource
                resourceName = path.basename(resourcePath);
                manifestFound = true;
                break;
              }
            }

            // If we still didn't find a manifest, try to determine the resource name from the path
            if (!manifestFound) {
              // Try to use the resourceManager to get the resource name
              resourceName = this.resourceManager.getResourceName(filePath);
            }
          }

          // Skip bracketed directory names as they're not actual resources
          if (
            resourceName &&
            resourceName !== 'webview' &&
            resourceName !== 'scripts' &&
            !resourceName.startsWith('[') &&
            !resourceName.endsWith(']')
          ) {
            this.logger.info(
              `Resource change detected in generated folder for '${resourceName}' (will restart after 3s debounce)`
            );
            // Use a longer debounce time (3 seconds) for generated resources to prevent rapid restarts
            this.debouncedTaskManager.execute(
              `generated-resource-${resourceName}`,
              async () => {
                this.logger.info(
                  `Debounced restart for generated resource: ${resourceName}`
                );
                await this.resourceManager.restartResource(resourceName);
              },
              3000 // Use a longer debounce time (3 seconds)
            );
          }
        } catch (error) {
          this.logger.error('Error processing file change:', error);
        }
      }
    );

    // Initial scan to build resource map
    this.resourceManager.scanForResources(generatedDir);
    this.logger.info(
      `Initially mapped ${this.resourceManager.getResourceCount()} resources`
    );
  }

  /**
   * Set up all watchers
   */
  setupAllWatchers(
    pluginsDir: string,
    coreDir: string,
    distDir: string,
    rebuildComponent: (
      componentType: 'plugin' | 'core' | 'webview',
      pluginDir?: string
    ) => Promise<void> | void
  ): void {
    // Setup different watchers
    this.setupPluginWatchers(pluginsDir, distDir, rebuildComponent);
    this.setupCoreWatcher(coreDir, distDir, rebuildComponent);
    this.setupWebviewWatcher(pluginsDir, distDir, rebuildComponent);
    this.setupDistWatcher(distDir);
    this.setupGeneratedFolderWatcher();
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
