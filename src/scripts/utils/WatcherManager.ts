/**
 * Watcher Manager to handle file watching
 */
import * as path from 'path';
import * as fs from 'fs';
import chokidar from 'chokidar';
import { DebouncedTaskManager } from './DebouncedTaskManager.js';
import { ResourceManager, findPluginPaths } from './fs/index.js';

/**
 * Watcher Manager to handle file watching
 */
export class WatcherManager {
  private watcherOptions = {
    ignoreInitial: true,
    ignored: ['**/node_modules/**', '**/.git/**'],
    persistent: true,
    usePolling: true,
    interval: 1000,
    depth: 99,
  };

  constructor(
    private readonly debouncedTaskManager: DebouncedTaskManager,
    private readonly resourceManager: ResourceManager
  ) {
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
   * Set up watcher for a directory with consistent options
   */
  setupDirectoryWatcher(
    dir: string,
    description: string,
    ignoredPaths: string[],
    filePattern: RegExp,
    onChange: (filePath: string) => void
  ): void {
    console.log(`Setting up watcher for ${description}: ${dir}`);

    const options = {
      ...this.watcherOptions,
      ignored: [...this.watcherOptions.ignored, ...ignoredPaths],
    };

    chokidar
      .watch(dir, options)
      .on('ready', () => {
        console.log(`Watcher ready for ${description}: ${dir}`);
      })
      .on('all', (event, filePath) => {
        console.log(`File event in ${description}:`, event, filePath);

        // Only respond to changes in relevant file types
        if (!filePattern.test(filePath)) {
          console.log(`Ignoring non-source file: ${filePath}`);
          return;
        }

        if (global.isBuilding) {
          console.log('Build already in progress, skipping');
          return;
        }

        onChange(filePath);
      });
  }

  /**
   * Set up watchers for plugins
   */
  setupPluginWatchers(
    pluginsDir: string,
    distDir: string,
    rebuildComponent: Function
  ): void {
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
  }

  /**
   * Set up watcher for core
   */
  setupCoreWatcher(
    coreDir: string,
    distDir: string,
    rebuildComponent: Function
  ): void {
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

        // Find the actual resource by looking for the manifest file
        let resourcePath = '';
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
            console.log(`Found resource with manifest: ${resourceName}`);
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
                console.log(
                  `Found resource from path structure: ${resourceName}`
                );
                break;
              }
            }

            // If we couldn't find a non-bracketed directory, use the last non-common directory
            if (!foundResource) {
              for (let i = pathParts.length - 3; i >= 0; i--) {
                if (!commonSubdirs.includes(pathParts[i])) {
                  resourceName = pathParts[i];
                  console.log(
                    `Using last non-common directory as resource: ${resourceName}`
                  );
                  break;
                }
              }
            }

            // If we still don't have a resource name, use the leaf directory
            if (!resourceName && pathParts.length > 1) {
              resourceName = pathParts[pathParts.length - 3];
              console.log(`Using leaf directory as resource: ${resourceName}`);
            }
          } else {
            // If not in a common subdirectory, find the last directory that's not in brackets
            for (let i = pathParts.length - 1; i >= 0; i--) {
              if (
                !pathParts[i].startsWith('[') &&
                !pathParts[i].endsWith(']') &&
                !commonSubdirs.includes(pathParts[i])
              ) {
                resourceName = pathParts[i];
                console.log(
                  `Using non-bracketed directory as resource: ${resourceName}`
                );
                break;
              }
            }

            // If we couldn't find a non-bracketed directory, use the leaf directory
            if (!resourceName && pathParts.length > 0) {
              resourceName = pathParts[pathParts.length - 1];
              console.log(`Using leaf directory as resource: ${resourceName}`);
            }
          }
        }

        // Log the detected resource but don't restart it
        // Resource reloading is handled by the generated folder watcher
        if (resourceName && resourceName !== 'scripts') {
          console.log(
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
      console.error(
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

    console.log(`Setting up watcher for generated resources: ${generatedDir}`);

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

              // If that fails, try to determine it from the path
              if (!resourceName) {
                // Check if the file is in a common subdirectory
                if (
                  pathParts.length >= 2 &&
                  commonSubdirs.includes(pathParts[pathParts.length - 2])
                ) {
                  // Find the last directory that's not a common subdirectory and not in brackets
                  for (let i = pathParts.length - 3; i >= 0; i--) {
                    if (
                      !commonSubdirs.includes(pathParts[i]) &&
                      !pathParts[i].startsWith('[') &&
                      !pathParts[i].endsWith(']')
                    ) {
                      resourceName = pathParts[i];
                      break;
                    }
                  }

                  // If we couldn't find a non-bracketed directory, use the first directory
                  if (!resourceName && pathParts.length > 0) {
                    resourceName = pathParts[0];
                  }
                } else if (pathParts.length > 0) {
                  // If not in a common subdirectory, use the first directory
                  resourceName = pathParts[0];
                }
              }
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
            console.log(
              `Resource change detected in generated folder for '${resourceName}' (will restart after 3s debounce)`
            );
            // Use a longer debounce time (3 seconds) for generated resources to prevent rapid restarts
            this.debouncedTaskManager.execute(
              `generated-resource-${resourceName}`,
              async () => {
                console.log(
                  `Debounced restart for generated resource: ${resourceName}`
                );
                await this.resourceManager.restartResource(resourceName);
              },
              3000 // Use a longer debounce time (3 seconds)
            );
          }
        } catch (error) {
          console.error('Error processing file change:', error);
        }
      }
    );

    // Initial scan to build resource map
    this.resourceManager.scanForResources(generatedDir);
    console.log(
      `Initially mapped ${this.resourceManager.getResourceCount()} resources`
    );
  }

  /**
   * Set up watcher for webview files
   */
  setupWebviewWatcher(
    pluginsDir: string,
    distDir: string,
    rebuildComponent: Function
  ): void {
    // Watch for changes in html/Page.tsx files
    this.setupDirectoryWatcher(
      pluginsDir,
      'webview files',
      [distDir],
      /html\/Page\.tsx$/,
      (filePath) => {
        console.log(`Webview file changed: ${filePath}`);
        // Get the plugin directory containing this file
        const pluginDir = path.dirname(path.dirname(filePath));
        this.debouncedTaskManager.execute(`webview-${pluginDir}`, () =>
          rebuildComponent('plugin', pluginDir)
        );
      }
    );
  }

  /**
   * Set up all watchers
   */
  setupAllWatchers(
    pluginsDir: string,
    coreDir: string,
    distDir: string,
    rebuildComponent: Function
  ): void {
    // Setup different watchers
    this.setupPluginWatchers(pluginsDir, distDir, rebuildComponent);
    this.setupCoreWatcher(coreDir, distDir, rebuildComponent);
    this.setupWebviewWatcher(pluginsDir, distDir, rebuildComponent);
    this.setupDistWatcher(distDir);
    this.setupGeneratedFolderWatcher();
  }
}
