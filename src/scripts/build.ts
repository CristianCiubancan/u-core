import * as path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import lodashDebounce from 'lodash.debounce';

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

// Using the File interface as it appears to be in the original code
// Adjust this based on actual File structure if needed
interface File {
  // Add properties based on what's actually used in the original code
  // This is a placeholder that needs to match the actual structure
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

// Global variables
let isBuilding = false;
const debounceMap = new Map<string, () => void>();

/**
 * Build a single plugin
 * @param plugin Plugin to build
 * @param distDir Output directory
 * @returns Build result or undefined if build failed
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
 * Parse command line arguments
 * @returns Parsed command line arguments
 */
function parseArgs(): CommandLineArgs {
  const args = process.argv.slice(2);
  return {
    watch: args.includes('--watch') || args.includes('-w'),
    reload: args.includes('--reload') || args.includes('-r'),
  };
}

/**
 * Create a debounced function that will only execute after wait time
 * @param key Unique identifier for the debounced function
 * @param fn Function to debounce
 * @param wait Wait time in milliseconds
 */
const debounce = (key: string, fn: () => Promise<void>, wait = 300) => {
  if (debounceMap.has(key)) {
    debounceMap.get(key)!();
  }

  const debouncedFn = lodashDebounce(async () => {
    try {
      await fn();
    } catch (error) {
      console.error(`Error in debounced function ${key}:`, error);
    } finally {
      debounceMap.delete(key);
    }
  }, wait);

  debounceMap.set(key, debouncedFn);
  debouncedFn();
};

/**
 * Get paths for the project
 * @returns Object containing various project paths
 */
function getProjectPaths() {
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
 * Main build function to build all plugins and resources
 * @returns Built plugins and core plugins
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

    // Build webview resources
    await buildWebview(plugins, distDir);

    // Generate webview manifest
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

    // Generate HTML files for plugins
    await generatePluginHtmlFiles(plugins, distDir);

    // Build regular plugins
    await buildAndGenerateManifests(plugins, distDir, true);

    // Build core plugins
    await buildAndGenerateManifests(corePlugins, distDir, false);

    console.log('Build completed successfully!');
    await moveBuiltResources(distDir);

    return { plugins, corePlugins };
  } catch (error) {
    console.error('Build failed:', error);
    throw error;
  }
}

/**
 * Build plugins and generate manifests
 * @param plugins Plugins to build
 * @param distDir Output directory
 * @param addWebviewDependencies Whether to add webview dependencies
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
 * Rebuild a specific plugin
 * @param pluginDir Plugin directory to rebuild
 */
async function rebuildPlugin(pluginDir: string) {
  console.log(`Rebuilding plugin: ${pluginDir}`);

  try {
    const { pluginPaths } = getPluginsPaths(path.dirname(pluginDir));
    const plugins = parsePluginPathsIntoPlugins(
      pluginPaths.filter((p) => p === pluginDir)
    );

    const { distDir } = getProjectPaths();

    await buildAndGenerateManifests(plugins, distDir, true);

    // Move built resources after rebuilding
    console.log(`Moving built resources for plugin: ${pluginDir}`);
    await moveBuiltResources(distDir);
  } catch (error) {
    console.error(`Error rebuilding plugin ${pluginDir}:`, error);
  }
}

/**
 * Rebuild core plugins
 */
async function rebuildCore() {
  console.log('Rebuilding core');

  try {
    const { coreDir, distDir } = getProjectPaths();
    const { pluginPaths } = getPluginsPaths(coreDir);
    const corePlugins = parsePluginPathsIntoPlugins(pluginPaths);

    await buildAndGenerateManifests(corePlugins, distDir, false);

    // Move built resources after rebuilding core
    console.log('Moving built resources for core');
    await moveBuiltResources(distDir);
  } catch (error) {
    console.error('Error rebuilding core:', error);
  }
}

/**
 * Rebuild webview resources
 */
async function rebuildWebview() {
  console.log('Rebuilding webview');

  try {
    const { pluginsDir, distDir } = getProjectPaths();
    const { pluginPaths } = getPluginsPaths(pluginsDir);
    const plugins = parsePluginPathsIntoPlugins(pluginPaths);

    await buildWebview(plugins, distDir);
    await generatePluginHtmlFiles(plugins, distDir);

    // Move built resources after rebuilding webview
    console.log('Moving built resources for webview');
    await moveBuiltResources(distDir);
  } catch (error) {
    console.error('Error rebuilding webview:', error);
  }
}

/**
 * Restart a resource
 * @param resourceName Name of the resource to restart
 */
async function restartResource(resourceName: string) {
  console.log(`Restarting resource: ${resourceName}`);
  // Add logic to restart the resource, e.g., via an API call or server command
  // Implementation depends on your specific environment
}

/**
 * Set up file watchers for development
 * @param pluginsDir Plugins directory
 * @param coreDir Core directory
 * @param distDir Output directory
 */
// Update the setupWatchers function with these changes
function setupWatchers(pluginsDir: string, coreDir: string, distDir: string) {
  const outputPaths = [distDir];
  const { pluginPaths } = getPluginsPaths(pluginsDir);

  // Log the paths we're going to watch
  console.log('Setting up direct watchers for plugin paths:', pluginPaths);

  // Set up watchers for each plugin directory individually
  for (const pluginDir of pluginPaths) {
    const normalizedPluginDir = path.normalize(pluginDir);
    console.log(`Setting up watcher for plugin: ${normalizedPluginDir}`);

    const pluginWatcher = chokidar.watch(normalizedPluginDir, {
      ignoreInitial: true,
      ignored: [
        ...outputPaths,
        // Exclude node_modules, .git, etc.
        '**/node_modules/**',
        '**/.git/**',
      ],
      persistent: true,
      usePolling: true, // More reliable on Windows with special characters
      interval: 1000,
      depth: 99, // Make sure we catch deeply nested files
    });

    pluginWatcher
      .on('ready', () => {
        console.log(`Watcher ready for: ${normalizedPluginDir}`);
      })
      .on('all', (event, filePath) => {
        console.log(`File event in ${normalizedPluginDir}:`, event, filePath);

        // Only respond to changes in relevant file types
        if (!/\.(ts|json|lua|tsx|jsx|css|html)$/.test(filePath)) {
          console.log(`Ignoring non-source file: ${filePath}`);
          return;
        }

        if (isBuilding) {
          console.log('Build already in progress, skipping');
          return;
        }

        // Handle the file change based on which directory it's in
        if (filePath.includes('html/') || filePath.includes('html\\')) {
          console.log('HTML file changed, rebuilding webview');
          debounce('webview', async () => {
            isBuilding = true;
            try {
              await rebuildWebview();
            } finally {
              isBuilding = false;
            }
          });
        } else {
          console.log(
            `Source file changed in ${normalizedPluginDir}, rebuilding plugin`
          );
          debounce(normalizedPluginDir, async () => {
            isBuilding = true;
            try {
              await rebuildPlugin(normalizedPluginDir);
            } finally {
              isBuilding = false;
            }
          });
        }
      });
  }

  // Similar approach for core directory
  console.log(`Setting up watcher for core: ${coreDir}`);
  chokidar
    .watch(coreDir, {
      ignoreInitial: true,
      ignored: outputPaths,
      persistent: true,
      usePolling: true,
      interval: 1000,
    })
    .on('ready', () => {
      console.log(`Core watcher ready for: ${coreDir}`);
    })
    .on('all', (event, filePath) => {
      console.log(`File event in core:`, event, filePath);

      if (!/\.(ts|json|lua)$/.test(filePath)) {
        console.log(`Ignoring non-source file: ${filePath}`);
        return;
      }

      if (isBuilding) return;

      debounce('core', async () => {
        isBuilding = true;
        try {
          await rebuildCore();
        } finally {
          isBuilding = false;
        }
      });
    });

  // Watch webview directory separately
  const webviewDir = path.join(pluginsDir, '..', 'webview');
  console.log(`Setting up watcher for webview: ${webviewDir}`);
  chokidar
    .watch(webviewDir, {
      ignoreInitial: true,
      ignored: outputPaths,
      persistent: true,
      usePolling: true,
      interval: 1000,
    })
    .on('ready', () => {
      console.log(`Webview watcher ready for: ${webviewDir}`);
    })
    .on('all', (event, filePath) => {
      console.log(`File event in webview:`, event, filePath);

      if (isBuilding) return;

      debounce('webview', async () => {
        isBuilding = true;
        try {
          await rebuildWebview();
        } finally {
          isBuilding = false;
        }
      });
    });

  // Watch dist for resource restarts
  console.log(`Setting up watcher for dist: ${distDir}`);
  chokidar
    .watch(distDir, {
      ignoreInitial: true,
      ignored: [...outputPaths, path.join(distDir, 'scripts', '**')],
      persistent: true,
    })
    .on('ready', () => {
      console.log(`Dist watcher ready for: ${distDir}`);
    })
    .on('all', (event, filePath) => {
      console.log(`File event in dist:`, event, filePath);

      if (isBuilding) return;

      const relativePath = path.relative(distDir, path.dirname(filePath));
      const potentialResource = relativePath.split(path.sep)[0];

      if (potentialResource && potentialResource !== 'scripts') {
        console.log(`Resource change detected: ${potentialResource}`);
        debounce(`resource-${potentialResource}`, async () => {
          await restartResource(potentialResource);
        });
      }
    });
}

/**
 * Main execution function
 */
async function main() {
  const { watch, reload } = parseArgs();
  const reloaderConfig: ReloaderConfig = {
    enabled: reload,
    host: process.env.RELOADER_HOST || 'localhost',
    port: parseInt(process.env.RELOADER_PORT || '30120', 10),
    apiKey: process.env.RELOADER_API_KEY || '',
  };

  console.log('Starting initial build...');
  try {
    await build();

    if (watch) {
      const { pluginsDir, coreDir, distDir } = getProjectPaths();
      setupWatchers(pluginsDir, coreDir, distDir);
      console.log('Watcher started. Press Ctrl+C to stop.');
    }
  } catch (error) {
    console.error('Build process failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error in main process:', error);
  process.exit(1);
});
