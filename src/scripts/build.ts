import * as path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import lodashDebounce from 'lodash.debounce';
import http from 'http';
import fs from 'fs';

import {
  categorizeGeneratedFiles,
  ensureDirectoryExists,
  getPluginOutputInfo,
  getPluginScripts,
  getPluginsPaths,
  parseFilePathsIntoFiles,
  parsePluginPathsIntoPlugins,
  Plugin,
  processFile,
  readPluginJson,
} from './utils/file.js';
import {
  generateManifest,
  preparePluginManifestData,
} from './utils/manifest.js';
import { verifyOutputDir } from './utils/bundler.js';
import { buildPluginWebview } from './utils/webview.js';
import { moveBuiltResources } from './utils/moveBuiltResources.js';

interface PluginBuildResult {
  updatedPluginJson: Record<string, any>;
  manifestPath: string;
}

interface CommandLineArgs {
  watch: boolean;
  reload: boolean;
}

interface ProjectPaths {
  pluginsDir: string;
  coreDir: string;
  distDir: string;
  rootDir: string;
}

// Global state
let isBuilding = false;

/**
 * Utility class to manage debounced tasks
 */
class DebouncedTaskManager {
  private tasks = new Map<string, { fn: Function; cancel: () => void }>();

  /**
   * Execute a debounced task with the specified key and wait time
   */
  execute(key: string, fn: () => Promise<void> | void, wait = 300): void {
    console.log(`Debouncing function for key: ${key} with wait: ${wait}ms`);

    // Cancel previous task if it exists
    this.cancel(key);

    // Create a new debounced function
    const debouncedFn = lodashDebounce(async () => {
      console.log(`Executing debounced function for key: ${key}`);
      try {
        const result = fn();
        // Handle both Promise and non-Promise returns
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error(`Error in debounced function ${key}:`, error);
      } finally {
        // Clean up after execution
        this.tasks.delete(key);
      }
    }, wait);

    // Store the task
    this.tasks.set(key, { fn: debouncedFn, cancel: debouncedFn.cancel });

    // Execute the debounced function
    debouncedFn();
  }

  /**
   * Cancel a debounced task with the specified key
   */
  cancel(key: string): void {
    if (this.tasks.has(key)) {
      console.log(`Cancelling previous debounced function for key: ${key}`);
      const task = this.tasks.get(key)!;
      task.cancel();
      this.tasks.delete(key);
    }
  }
}

/**
 * Resource Manager to handle resource-related operations
 */
class ResourceManager {
  private resourceMap = new Map<string, string>(); // Maps path -> resource name
  private resourceRestartTimestamps = new Map<string, number>();
  private readonly RESTART_COOLDOWN_MS = 2000; // 2 seconds cooldown

  constructor(private readonly generatedDir?: string) {
    if (generatedDir) {
      console.log(
        `ResourceManager initialized with generatedDir: ${generatedDir}`
      );
    }
  }

  /**
   * Get the number of mapped resources
   */
  getResourceCount(): number {
    return this.resourceMap.size;
  }

  /**
   * Determine resource name from a path
   */
  getResourceName(filePath: string): string | null {
    // Common subdirectories that aren't resources
    const commonSubdirs = [
      'client',
      'server',
      'shared',
      'html',
      'translations',
      'assets',
    ];

    if (!this.generatedDir) {
      // If no generatedDir is provided, we need to determine the resource name from the path

      // Start from the directory containing the file
      let currentDir = path.dirname(filePath);
      let dirName = path.basename(currentDir);

      // If the current directory is a common subdirectory, move up one level
      if (commonSubdirs.includes(dirName)) {
        currentDir = path.dirname(currentDir);
        dirName = path.basename(currentDir);
      }

      // Check if the directory has a manifest
      const manifestPath = path.join(currentDir, 'fxmanifest.lua');
      if (fs.existsSync(manifestPath)) {
        // First check if the manifest defines a name
        const manifestName = this.getResourceNameFromManifest(manifestPath);
        if (manifestName) {
          return manifestName;
        }
      }

      // If the directory name is in brackets, try to find a non-bracketed parent directory
      if (dirName.startsWith('[') && dirName.endsWith(']')) {
        // Split the path into parts
        const pathParts = currentDir.split(path.sep);

        // Start from the end and work backwards to find a non-bracketed directory
        for (let i = pathParts.length - 2; i >= 0; i--) {
          if (
            !pathParts[i].startsWith('[') &&
            !pathParts[i].endsWith(']') &&
            !commonSubdirs.includes(pathParts[i])
          ) {
            return pathParts[i];
          }
        }
      }

      // Return the resource name (directory name)
      return dirName;
    }

    // Start from the directory containing the file
    let currentDir = path.dirname(filePath);

    // Walk up the directory tree looking for a manifest
    while (currentDir && currentDir !== this.generatedDir) {
      const manifestPath = path.join(currentDir, 'fxmanifest.lua');

      // Check if we've already mapped this directory to a resource
      if (this.resourceMap.has(currentDir)) {
        return this.resourceMap.get(currentDir)!;
      }

      // Check if this directory has a manifest
      if (fs.existsSync(manifestPath)) {
        // First check if the manifest defines a name
        const manifestName = this.getResourceNameFromManifest(manifestPath);
        if (manifestName) {
          this.resourceMap.set(currentDir, manifestName);
          return manifestName;
        }

        // If no name in manifest, use the leaf directory name
        const leafDirName = path.basename(currentDir);

        // If the leaf directory is in brackets, try to find a non-bracketed parent
        if (leafDirName.startsWith('[') && leafDirName.endsWith(']')) {
          // Split the path into parts
          const pathParts = currentDir.split(path.sep);

          // Start from the end and work backwards to find a non-bracketed directory
          for (let i = pathParts.length - 2; i >= 0; i--) {
            if (
              !pathParts[i].startsWith('[') &&
              !pathParts[i].endsWith(']') &&
              !commonSubdirs.includes(pathParts[i])
            ) {
              const resourceName = pathParts[i];
              this.resourceMap.set(currentDir, resourceName);
              return resourceName;
            }
          }
        }

        this.resourceMap.set(currentDir, leafDirName);
        return leafDirName;
      }

      // Move up one directory
      currentDir = path.dirname(currentDir);
    }

    // Fallback: if we couldn't find a manifest, use first directory in relative path
    const relativePath = path.relative(this.generatedDir || '', filePath);
    const pathParts = relativePath.split(path.sep);

    // If the first part is in brackets, try to find a non-bracketed part
    if (
      pathParts.length > 0 &&
      pathParts[0].startsWith('[') &&
      pathParts[0].endsWith(']')
    ) {
      // Look for the first non-bracketed, non-common subdirectory
      for (let i = 1; i < pathParts.length; i++) {
        if (
          !pathParts[i].startsWith('[') &&
          !pathParts[i].endsWith(']') &&
          !commonSubdirs.includes(pathParts[i])
        ) {
          return pathParts[i];
        }
      }
    }

    // Skip common subdirectories that aren't resources
    if (pathParts.length > 1 && commonSubdirs.includes(pathParts[1])) {
      return pathParts[0];
    }

    return pathParts[0] || null;
  }

  /**
   * Extract resource name from manifest file
   */
  getResourceNameFromManifest(manifestPath: string): string | null {
    try {
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf8');
        const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
        if (nameMatch && nameMatch[1]) {
          return nameMatch[1];
        }
      }
    } catch (error) {
      console.error('Error reading manifest:', error);
    }
    return null;
  }

  /**
   * Scan directory for resources and build resource map
   */
  scanForResources(dir: string): void {
    try {
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);

        try {
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            // Check if this directory has a manifest
            const manifestPath = path.join(fullPath, 'fxmanifest.lua');
            if (fs.existsSync(manifestPath)) {
              // Get resource name from manifest or use directory name
              const manifestName =
                this.getResourceNameFromManifest(manifestPath);
              const resourceName = manifestName || entry;

              this.resourceMap.set(fullPath, resourceName);
              console.log(
                `Mapped directory ${fullPath} to resource ${resourceName}`
              );
            }

            // Recursively scan subdirectories
            this.scanForResources(fullPath);
          }
        } catch (error) {
          // Skip if can't access
        }
      }
    } catch (error) {
      console.error('Error scanning directory:', error);
    }
  }

  /**
   * Restart a resource with cooldown protection
   */
  async restartResource(resourceName: string): Promise<void> {
    // Skip common subdirectories that aren't resources
    const commonSubdirs = [
      'client',
      'server',
      'shared',
      'html',
      'translations',
      'assets',
    ];

    if (commonSubdirs.includes(resourceName)) {
      console.log(
        `Skipping restart for '${resourceName}' as it appears to be a subdirectory, not a resource`
      );
      return;
    }

    // Skip if resource name is in brackets (these are directory containers, not actual resources)
    if (resourceName.startsWith('[') && resourceName.endsWith(']')) {
      console.log(
        `Skipping restart for '${resourceName}' as it appears to be a directory container, not a resource`
      );
      return;
    }

    console.log(`Restarting resource: ${resourceName}`);

    // Skip if resource name is empty or undefined
    if (!resourceName) {
      console.error(`Invalid resource name: ${resourceName}`);
      return;
    }

    // Check if this resource was recently restarted
    const lastRestartTime =
      this.resourceRestartTimestamps.get(resourceName) || 0;
    const now = Date.now();
    const timeSinceLastRestart = now - lastRestartTime;

    if (timeSinceLastRestart < this.RESTART_COOLDOWN_MS) {
      console.log(
        `Skipping restart for ${resourceName} - last restart was ${timeSinceLastRestart}ms ago (cooldown: ${this.RESTART_COOLDOWN_MS}ms)`
      );
      return;
    }

    // Update the timestamp for this resource
    this.resourceRestartTimestamps.set(resourceName, now);

    await this.notifyResourceManager(resourceName);
  }

  /**
   * Notify resource manager to restart a resource
   */
  private notifyResourceManager(resourceName: string): Promise<void> {
    return new Promise((resolve) => {
      // Check if reloader is enabled
      if (process.env.RELOADER_ENABLED !== 'true') {
        console.log(
          `Resource reloader is disabled. Skipping restart for ${resourceName}`
        );
        resolve();
        return;
      }

      // Properly encode resource name
      const encodedResourceName = encodeURIComponent(resourceName);

      const options = {
        hostname: process.env.RELOADER_HOST || 'localhost',
        port: parseInt(process.env.RELOADER_PORT || '3414', 10),
        path: `/restart?resource=${encodedResourceName}`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${
            process.env.RELOADER_API_KEY || 'your-secure-api-key'
          }`,
        },
      };

      console.log(`Sending restart request for resource: ${resourceName}`);

      const req = http.request(options, (res: any) => {
        let data = '';

        res.on('data', (chunk: any) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log(
              `Resource reload ${
                response.success ? 'successful' : 'failed'
              } for ${resourceName}`
            );

            if (!response.success) {
              console.log(`Failed response: ${JSON.stringify(response)}`);
            }

            // Add a delay before resolving to prevent rapid-fire restarts
            setTimeout(() => {
              resolve();
            }, 500);
          } catch (error) {
            console.error('Error parsing response:', error);
            console.error('Raw response data:', data);
            resolve(); // Still resolve to prevent chain from breaking
          }
        });
      });

      req.on('error', (error: any) => {
        console.error(`Error notifying resource manager: ${error.message}`);
        // Still resolve to prevent chain from breaking
        setTimeout(() => {
          resolve();
        }, 500);
      });

      // Set a timeout for the request
      req.setTimeout(5000, () => {
        console.error(`Request timeout for resource: ${resourceName}`);
        req.destroy();
        resolve(); // Still resolve to prevent chain from breaking
      });

      req.end();
    });
  }
}

/**
 * Watcher Manager to handle file watching
 */
class WatcherManager {
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

        if (isBuilding) {
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
    const { pluginPaths } = getPluginsPaths(pluginsDir);
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

/**
 * Get paths for the project
 */
function getProjectPaths(): ProjectPaths {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.join(__dirname, '../../');

  return {
    pluginsDir: path.join(__dirname, '../plugins'),
    coreDir: path.join(__dirname, '../core'),
    distDir: path.join(rootDir, 'dist'),
    rootDir,
  };
}

/**
 * Parse command line arguments
 */
function parseArgs(): CommandLineArgs {
  const args = process.argv.slice(2);
  return {
    watch: args.includes('--watch') || args.includes('-w'),
    reload: args.includes('--reload') || args.includes('-r'),
  };
}
/**
 * Check if a plugin has HTML content (Page.tsx)
 * @param plugin The plugin to check
 * @returns Promise<boolean> True if the plugin has HTML content
 */
async function checkForHtmlContent(plugin: Plugin): Promise<boolean> {
  if (!plugin.fullPath) return false;

  const htmlDir = path.join(plugin.fullPath, 'html');
  const pageTsxPath = path.join(htmlDir, 'Page.tsx');

  try {
    await fs.promises.access(htmlDir);
    try {
      await fs.promises.access(pageTsxPath);
      return true;
    } catch {
      // Page.tsx doesn't exist
      return false;
    }
  } catch {
    // html directory doesn't exist
    return false;
  }
}

/**
 * Build a single plugin
 */
async function buildPlugin(
  plugin: Plugin,
  distDir: string
): Promise<PluginBuildResult | undefined> {
  if (!plugin.fullPath) {
    console.log(`Skipping plugin with no path: ${plugin.name || 'unknown'}`);
    return;
  }

  console.log(`Building plugin: ${plugin.name}`);

  try {
    // Get plugin output info
    const { outputDir, manifestPath } = getPluginOutputInfo(plugin, distDir);

    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);

    // Read plugin.json
    const jsonPath = path.join(plugin.fullPath, 'plugin.json');

    const pluginJsonData = readPluginJson(jsonPath);

    // If plugin.json is not found, skip this plugin
    if (pluginJsonData === null) {
      console.warn(
        `Plugin ${plugin.name} does not have a plugin.json file, skipping`
      );
      return undefined;
    }

    // Get the files for this plugin
    const pluginFiles = parseFilePathsIntoFiles(plugin.fullPath);
    plugin.files = plugin.files || [];
    plugin.files.push(...pluginFiles);

    // Get script files based on patterns in plugin.json
    const scriptFiles = getPluginScripts(pluginJsonData, plugin.fullPath);

    // Process all files
    const processPromises = plugin.files.map((file) =>
      processFile(file, outputDir)
    );
    const processedFiles = await Promise.all(processPromises);

    // Categorize generated files
    const generatedFiles = categorizeGeneratedFiles(processedFiles);

    // Prepare manifest data
    const updatedPluginJson = preparePluginManifestData(
      pluginJsonData,
      generatedFiles,
      scriptFiles
    );

    // Check if plugin has HTML content to build webview
    // This should be determined by checking if there's a 'html' directory with a Page.tsx file
    plugin.hasHtml = plugin.hasHtml || (await checkForHtmlContent(plugin));

    // Build the webview if the plugin has HTML content
    if (plugin.hasHtml && plugin.fullPath) {
      try {
        const htmlDir = await buildPluginWebview(plugin, distDir);
        console.log(`Webview built successfully at: ${htmlDir}`);

        // The files are already in the html directory, so we just need to update the manifest
        if (!updatedPluginJson.files) {
          updatedPluginJson.files = ['html/**/*'];
        } else if (!updatedPluginJson.files.includes('html/**/*')) {
          updatedPluginJson.files.push('html/**/*');
        }

        // Set the ui_page if it's not already set
        if (!updatedPluginJson.ui_page) {
          updatedPluginJson.ui_page = 'html/index.html';
        }
      } catch (error) {
        console.error(
          `Error building webview for plugin ${plugin.name}:`,
          error
        );
        // Continue with the build even if webview fails
      }
    }

    // Verify the output directory content
    await verifyOutputDir(outputDir);

    return { updatedPluginJson, manifestPath };
  } catch (error) {
    console.error(`Error building plugin ${plugin.name}:`, error);
    return undefined;
  }
}

/**
 * Build plugins and generate manifests
 */
async function buildAndGenerateManifests(plugins: Plugin[], distDir: string) {
  for (const plugin of plugins) {
    const result = await buildPlugin(plugin, distDir);
    if (!result) continue;
    const { updatedPluginJson, manifestPath } = result;

    // Generate manifest with the updated plugin JSON data
    generateManifest(updatedPluginJson, manifestPath);
  }
}

/**
 * Main build function to build all plugins and resources
 */
async function build() {
  const { pluginsDir, coreDir, distDir } = getProjectPaths();

  try {
    await ensureDirectoryExists(distDir);
    await ensureDirectoryExists(coreDir);

    const { pluginPaths } = getPluginsPaths(pluginsDir);
    const { pluginPaths: corePluginPaths } = getPluginsPaths(coreDir);

    const plugins = parsePluginPathsIntoPlugins(pluginPaths);
    const corePlugins = parsePluginPathsIntoPlugins(corePluginPaths);

    console.log(
      `Found ${plugins.length} plugins and ${corePlugins.length} core plugins`
    );

    // Build order:
    // 1. Build core plugins first
    console.log('Building core plugins...');
    await buildAndGenerateManifests(corePlugins, distDir);

    // 2. Build regular plugins
    console.log('Building regular plugins...');
    await buildAndGenerateManifests(plugins, distDir);

    // 3. Generate webview manifest if needed
    const webviewDir = path.join(distDir, 'webview');
    if (fs.existsSync(webviewDir)) {
      console.log('Generating webview manifest...');
      generateManifest(
        {
          name: 'webview',
          version: '0.1.0',
          fx_version: 'cerulean',
          author: 'Baloony Gaze',
          games: ['gta5', 'rdr3'],
          description: 'Shared webview assets',
          files: ['index.html', 'assets/**/*'],
        },
        path.join(webviewDir, 'fxmanifest.lua')
      );
    }

    console.log('Build completed successfully!');

    // 4. Move built resources
    await moveBuiltResources(distDir);

    return { plugins, corePlugins };
  } catch (error) {
    console.error('Build failed:', error);
    throw error;
  }
}

/**
 * Rebuild component wrapper to handle common tasks
 */
async function rebuildComponent(
  componentType: 'plugin' | 'core' | 'webview',
  pluginDir?: string
) {
  console.log(
    `Rebuilding ${componentType}${pluginDir ? `: ${pluginDir}` : ''}`
  );
  isBuilding = true;

  try {
    const { coreDir, distDir } = getProjectPaths();

    switch (componentType) {
      case 'plugin': {
        if (!pluginDir) throw new Error('Plugin directory is required');
        const { pluginPaths } = getPluginsPaths(path.dirname(pluginDir));
        const plugins = parsePluginPathsIntoPlugins(
          pluginPaths.filter((p) => p === pluginDir)
        );
        await buildAndGenerateManifests(plugins, distDir);
        break;
      }
      case 'core': {
        const { pluginPaths } = getPluginsPaths(coreDir);
        const corePlugins = parsePluginPathsIntoPlugins(pluginPaths);
        await buildAndGenerateManifests(corePlugins, distDir);
        break;
      }
      case 'webview': {
        // If we need to rebuild webview assets, we would handle that here
        // For now, just log that we don't have a specific handler
        console.log(
          'Webview rebuild requested, but no specific handler implemented'
        );
        break;
      }
    }

    // Check if we need to generate a webview manifest
    const webviewDir = path.join(distDir, 'webview');
    if (fs.existsSync(webviewDir)) {
      console.log('Generating webview manifest...');
      generateManifest(
        {
          name: 'webview',
          version: '0.1.0',
          fx_version: 'cerulean',
          author: 'Baloony Gaze',
          games: ['gta5', 'rdr3'],
          description: 'Shared webview assets',
          files: ['index.html', 'assets/**/*'],
        },
        path.join(webviewDir, 'fxmanifest.lua')
      );
    }

    await moveBuiltResources(distDir);
  } catch (error) {
    console.error(`Error rebuilding ${componentType}:`, error);
  } finally {
    isBuilding = false;
  }
}

/**
 * Configure environment for resource reloading
 */
function configureEnvironment(reload: boolean): void {
  if (reload) {
    process.env.RELOADER_ENABLED = 'true';
    process.env.RELOADER_HOST = process.env.RELOADER_HOST || 'localhost';
    process.env.RELOADER_PORT = process.env.RELOADER_PORT || '3414';
    process.env.RELOADER_API_KEY =
      process.env.RELOADER_API_KEY || 'your-secure-api-key';
  } else {
    process.env.RELOADER_ENABLED = 'false';
  }
}

/**
 * Main execution function
 */
async function main() {
  const { watch, reload } = parseArgs();

  // Configure environment variables for resource reloading
  configureEnvironment(reload);

  console.log(
    'Starting initial build with reload:',
    reload ? 'enabled' : 'disabled'
  );

  try {
    // Perform the full build first
    await build();

    // Set up watchers if in watch mode
    if (watch) {
      const debouncedTaskManager = new DebouncedTaskManager();
      const resourceManager = new ResourceManager();
      const watcherManager = new WatcherManager(
        debouncedTaskManager,
        resourceManager
      );

      const { pluginsDir, coreDir, distDir } = getProjectPaths();
      watcherManager.setupAllWatchers(
        pluginsDir,
        coreDir,
        distDir,
        rebuildComponent
      );

      console.log('Watchers started. Press Ctrl+C to stop.');
    }
  } catch (error) {
    console.error('Build process failed:', error);
    process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  console.error('Unhandled error in main process:', error);
  process.exit(1);
});
