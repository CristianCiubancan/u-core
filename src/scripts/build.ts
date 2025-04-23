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
  processFile,
  readPluginJson,
} from './utils/file.js';
import {
  generateManifest,
  preparePluginManifestData,
} from './utils/manifest.js';
import { verifyOutputDir } from './utils/bundler.js';
import { buildWebview } from './utils/webview.js';
import { generatePluginHtmlFiles } from './utils/htmlGenerator.js';
import { moveBuiltResources } from './utils/moveBuiltResources.js';

// Define types to replace 'any'
interface Plugin {
  name: string;
  fullPath?: string;
  files?: any[]; // Using any[] since we don't know the exact File structure
  hasHtml?: boolean;
}

interface ProcessedFile {
  originalPath: string;
  outputPath: string;
  category?: string;
}

interface PluginBuildResult {
  updatedPluginJson: Record<string, any>;
  manifestPath: string;
}

interface CommandLineArgs {
  watch: boolean;
  reload: boolean;
}

interface ReloaderConfig {
  enabled: boolean;
  host: string;
  port: number;
  apiKey: string;
}

interface ProjectPaths {
  pluginsDir: string;
  coreDir: string;
  distDir: string;
  rootDir: string;
}

// Define type for debounced function with cancel method
interface DebouncedFunction {
  (): void;
  cancel?: () => void;
}

// Global state
let isBuilding = false;
const debounceMap = new Map<string, DebouncedFunction>();
const resourceMap = new Map<string, string>(); // Maps path -> resource name

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
 * Create a debounced function that will only execute after wait time
 */
const debounce = (key: string, fn: () => Promise<void> | void, wait = 300) => {
  console.log(`Debouncing function for key: ${key} with wait: ${wait}ms`);

  // If we already have a debounced function for this key, cancel it
  if (debounceMap.has(key)) {
    console.log(`Cancelling previous debounced function for key: ${key}`);
    const existingFn = debounceMap.get(key)!;
    // Cancel the previous debounced function if it has a cancel method
    if (existingFn.cancel) {
      existingFn.cancel();
    }
    debounceMap.delete(key); // Remove it from the map
  }

  // Create a new debounced function with the specified wait time
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
      if (debounceMap.has(key)) {
        debounceMap.delete(key);
      }
    }
  }, wait);

  // Store the debounced function in the map
  debounceMap.set(key, debouncedFn);

  // Execute the debounced function
  debouncedFn();
};

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
async function buildAndGenerateManifests(
  plugins: Plugin[],
  distDir: string,
  addWebviewDependencies: boolean
) {
  for (const plugin of plugins) {
    const result = await buildPlugin(plugin, distDir);
    if (!result) continue;

    const { updatedPluginJson, manifestPath } = result;

    if (addWebviewDependencies && plugin.hasHtml) {
      updatedPluginJson.ui_page = 'html/index.html';

      if (!updatedPluginJson.files) {
        updatedPluginJson.files = ['html/**/*'];
      } else if (!updatedPluginJson.files.includes('html/**/*')) {
        updatedPluginJson.files.push('html/**/*');
      }

      if (!updatedPluginJson.dependencies) {
        updatedPluginJson.dependencies = ['webview'];
      } else if (!updatedPluginJson.dependencies.includes('webview')) {
        updatedPluginJson.dependencies.push('webview');
      }
    }

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
    // 1. Build webview resources
    await buildWebview(plugins, distDir);

    // 2. Generate webview manifest
    generateManifest(
      {
        name: 'webview',
        version: '0.1.0',
        fx_version: 'cerulean',
        author: 'Baloony Gaze',
        games: ['gta5', 'rdr3'],
        description: 'Example 3',
        files: ['index.html', 'assets/**/*'],
      },
      path.join(distDir, 'webview', 'fxmanifest.lua')
    );

    // 3. Generate HTML files for plugins
    await generatePluginHtmlFiles(plugins, distDir);

    // 4. Build regular plugins
    await buildAndGenerateManifests(plugins, distDir, true);

    // 5. Build core plugins
    await buildAndGenerateManifests(corePlugins, distDir, false);

    console.log('Build completed successfully!');

    // 6. Move built resources
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
    const { pluginsDir, coreDir, distDir } = getProjectPaths();

    switch (componentType) {
      case 'plugin': {
        if (!pluginDir) throw new Error('Plugin directory is required');
        const { pluginPaths } = getPluginsPaths(path.dirname(pluginDir));
        const plugins = parsePluginPathsIntoPlugins(
          pluginPaths.filter((p) => p === pluginDir)
        );
        await buildAndGenerateManifests(plugins, distDir, true);
        break;
      }
      case 'core': {
        const { pluginPaths } = getPluginsPaths(coreDir);
        const corePlugins = parsePluginPathsIntoPlugins(pluginPaths);
        await buildAndGenerateManifests(corePlugins, distDir, false);
        break;
      }
      case 'webview': {
        const { pluginPaths } = getPluginsPaths(pluginsDir);
        const plugins = parsePluginPathsIntoPlugins(pluginPaths);
        await buildWebview(plugins, distDir);
        await generatePluginHtmlFiles(plugins, distDir);
        break;
      }
    }

    // Move built resources after rebuilding
    await moveBuiltResources(distDir);
  } catch (error) {
    console.error(`Error rebuilding ${componentType}:`, error);
  } finally {
    isBuilding = false;
  }
}

// Track resource restart requests to prevent duplicates
const resourceRestartTimestamps = new Map<string, number>();
const RESTART_COOLDOWN_MS = 2000; // 2 seconds cooldown between restarts of the same resource

/**
 * Notify resource manager to restart a resource
 * @returns Promise that resolves when notification is complete
 */
function notifyResourceManager(resourceName: string): Promise<void> {
  return new Promise((resolve) => {
    // Skip if resource name is empty or undefined
    if (!resourceName) {
      console.error(`Invalid resource name: ${resourceName}`);
      resolve();
      return;
    }

    // Check if this resource was recently restarted
    const lastRestartTime = resourceRestartTimestamps.get(resourceName) || 0;
    const now = Date.now();
    const timeSinceLastRestart = now - lastRestartTime;

    if (timeSinceLastRestart < RESTART_COOLDOWN_MS) {
      console.log(
        `Skipping restart for ${resourceName} - last restart was ${timeSinceLastRestart}ms ago (cooldown: ${RESTART_COOLDOWN_MS}ms)`
      );
      resolve();
      return;
    }

    // Update the timestamp for this resource
    resourceRestartTimestamps.set(resourceName, now);

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

/**
 * Restart a resource
 */
async function restartResource(resourceName: string): Promise<void> {
  console.log(`Restarting resource: ${resourceName}`);
  await notifyResourceManager(resourceName);
}

/**
 * Extract resource name from manifest file
 */
function getResourceNameFromManifest(manifestPath: string): string | null {
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
 * Set up watcher for a directory with consistent options
 */
function setupDirectoryWatcher(
  dir: string,
  description: string,
  ignoredPaths: string[],
  filePattern: RegExp,
  onChange: (filePath: string) => void
) {
  console.log(`Setting up watcher for ${description}: ${dir}`);

  chokidar
    .watch(dir, {
      ignoreInitial: true,
      ignored: [...ignoredPaths, '**/node_modules/**', '**/.git/**'],
      persistent: true,
      usePolling: true,
      interval: 1000,
      depth: 99,
    })
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
 * Set up file watchers for plugins
 */
function setupPluginWatchers(pluginsDir: string, distDir: string) {
  const { pluginPaths } = getPluginsPaths(pluginsDir);
  const outputPaths = [distDir];

  // Set up individual plugin watchers
  for (const pluginDir of pluginPaths) {
    const normalizedPluginDir = path.normalize(pluginDir);

    setupDirectoryWatcher(
      normalizedPluginDir,
      `plugin ${path.basename(normalizedPluginDir)}`,
      outputPaths,
      /\.(ts|json|lua|tsx|jsx|css|html)$/,
      (filePath) => {
        if (filePath.includes('html/') || filePath.includes('html\\')) {
          debounce('webview', () => rebuildComponent('webview'));
        } else {
          debounce(normalizedPluginDir, () =>
            rebuildComponent('plugin', normalizedPluginDir)
          );
        }
      }
    );
  }
}

/**
 * Set up file watchers for core
 */
function setupCoreWatcher(coreDir: string, distDir: string) {
  setupDirectoryWatcher(coreDir, 'core', [distDir], /\.(ts|json|lua)$/, () => {
    debounce('core', () => rebuildComponent('core'));
  });
}

/**
 * Set up file watchers for webview
 */
function setupWebviewWatcher(pluginsDir: string, distDir: string) {
  const webviewDir = path.join(pluginsDir, '..', 'webview');

  setupDirectoryWatcher(
    webviewDir,
    'webview',
    [distDir],
    /\.(ts|json|lua|tsx|jsx|css|html)$/,
    () => {
      debounce('webview', () => rebuildComponent('webview'));
    }
  );
}

/**
 * Set up watcher for dist directory to restart resources
 */
function setupDistWatcher(distDir: string) {
  setupDirectoryWatcher(
    distDir,
    'dist',
    [path.join(distDir, 'scripts', '**')],
    /.*/, // Match all files
    (filePath) => {
      const relativePath = path.relative(distDir, path.dirname(filePath));
      const potentialResource = relativePath.split(path.sep)[0];

      if (potentialResource && potentialResource !== 'scripts') {
        console.log(`Resource change detected: ${potentialResource}`);
        debounce(
          `resource-${potentialResource}`,
          async () => await restartResource(potentialResource)
        );
      }
    }
  );
}

/**
 * Determine resource name from a path
 */
function getResourceName(
  filePath: string,
  generatedDir: string
): string | null {
  // Start from the directory containing the file
  let currentDir = path.dirname(filePath);

  // Walk up the directory tree looking for a manifest
  while (currentDir && currentDir !== generatedDir) {
    const manifestPath = path.join(currentDir, 'fxmanifest.lua');

    // Check if we've already mapped this directory to a resource
    if (resourceMap.has(currentDir)) {
      return resourceMap.get(currentDir)!;
    }

    // Check if this directory has a manifest
    if (fs.existsSync(manifestPath)) {
      // First check if the manifest defines a name
      const manifestName = getResourceNameFromManifest(manifestPath);
      if (manifestName) {
        resourceMap.set(currentDir, manifestName);
        return manifestName;
      }

      // If no name in manifest, use the leaf directory name
      const leafDirName = path.basename(currentDir);
      resourceMap.set(currentDir, leafDirName);
      return leafDirName;
    }

    // Move up one directory
    currentDir = path.dirname(currentDir);
  }

  // Fallback: if we couldn't find a manifest, use first directory in relative path
  const relativePath = path.relative(generatedDir, filePath);
  const pathParts = relativePath.split(path.sep);
  return pathParts[0] || null;
}

/**
 * Scan directory for resources and build resource map
 */
function scanForResources(dir: string) {
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
            const manifestName = getResourceNameFromManifest(manifestPath);
            const resourceName = manifestName || entry;

            resourceMap.set(fullPath, resourceName);
            console.log(
              `Mapped directory ${fullPath} to resource ${resourceName}`
            );
          }

          // Recursively scan subdirectories
          scanForResources(fullPath);
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
 * Set up watcher for generated resources folder
 */
function setupGeneratedFolderWatcher() {
  if (!process.env.SERVER_NAME) {
    console.error(
      'SERVER_NAME environment variable is not set. Skipping generated folder watcher.'
    );
    return;
  }

  const generatedDirName = '[GENERATED]';
  const destinationBase = path.join(
    'txData',
    process.env.SERVER_NAME,
    'resources'
  );
  const generatedDir = path.join(destinationBase, generatedDirName);

  console.log(`Setting up watcher for generated resources: ${generatedDir}`);

  setupDirectoryWatcher(
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
        // Determine the actual resource name
        const resourceName = getResourceName(filePath, generatedDir);

        if (
          resourceName &&
          resourceName !== 'webview' &&
          resourceName !== 'scripts'
        ) {
          console.log(`Resource change detected, restarting: ${resourceName}`);
          // Use a longer debounce time for generated resources to prevent rapid restarts
          debounce(
            `generated-resource-${resourceName}`,
            async () => {
              console.log(
                `Debounced restart for generated resource: ${resourceName}`
              );
              await notifyResourceManager(resourceName);
            },
            1000 // Use a longer debounce time (1 second)
          );
        }
      } catch (error) {
        console.error('Error processing file change:', error);
      }
    }
  );

  // Initial scan to build resource map
  scanForResources(generatedDir);
  console.log(`Initially mapped ${resourceMap.size} resources`);
}

/**
 * Set up all watchers
 */
function setupWatchers() {
  const { pluginsDir, coreDir, distDir } = getProjectPaths();

  // Setup different watchers
  setupPluginWatchers(pluginsDir, distDir);
  setupCoreWatcher(coreDir, distDir);
  setupWebviewWatcher(pluginsDir, distDir);
  setupDistWatcher(distDir);
  setupGeneratedFolderWatcher();
}

/**
 * Main execution function
 */
async function main() {
  const { watch, reload } = parseArgs();

  // Configure environment variables for resource reloading
  if (reload) {
    process.env.RELOADER_ENABLED = 'true';
    process.env.RELOADER_HOST = process.env.RELOADER_HOST || 'localhost';
    process.env.RELOADER_PORT = process.env.RELOADER_PORT || '3414';
    process.env.RELOADER_API_KEY =
      process.env.RELOADER_API_KEY || 'your-secure-api-key';
  } else {
    process.env.RELOADER_ENABLED = 'false';
  }

  console.log(
    'Starting initial build with reload:',
    reload ? 'enabled' : 'disabled'
  );

  try {
    // Perform the full build first
    await build();

    // Set up watchers if in watch mode
    if (watch) {
      setupWatchers();
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
