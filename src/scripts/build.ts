import * as path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar'; // Add chokidar import for file watching
import * as http from 'http';

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

/**
 * Build a single plugin
 */
async function buildPlugin(
  plugin: any,
  distDir: string
): Promise<
  | {
      updatedPluginJson: any;
      manifestPath: string;
    }
  | undefined
> {
  if (!plugin.fullPath) {
    console.log(`Skipping plugin with no path: ${plugin.name || 'unknown'}`);
    return;
  }

  console.log(`Building plugin: ${plugin.name}`);

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
  const processPromises = plugin.files.map((file: any) =>
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
}

/**
 * Find a plugin by its path
 */
function findPluginByPath(plugins: any[], filePath: string): any | undefined {
  return plugins.find((plugin) => filePath.startsWith(plugin.fullPath));
}

/**
 * Resource reloader configuration
 */
interface ReloaderConfig {
  enabled: boolean;
  host: string;
  port: number;
  apiKey: string;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    watch: args.includes('--watch') || args.includes('-w'),
    reload: args.includes('--reload') || args.includes('-r'),
  };
}

/**
 * Get resource reloader configuration from environment variables or defaults
 */
function getReloaderConfig(): ReloaderConfig {
  // Log environment variables to help with debugging
  console.log('RESOURCE_MANAGER_HOST:', process.env.RESOURCE_MANAGER_HOST);
  console.log('RESOURCE_MANAGER_PORT:', process.env.RESOURCE_MANAGER_PORT);
  console.log(
    'API_KEY from env:',
    process.env.API_KEY ? '[PRESENT]' : '[MISSING]'
  );

  return {
    enabled: true,
    host: process.env.RESOURCE_MANAGER_HOST || 'localhost',
    port: parseInt(process.env.RESOURCE_MANAGER_PORT || '3414'),
    // Important: Make sure this matches the API_KEY in your resource manager
    apiKey: process.env.API_KEY || 'your-secure-api-key',
  };
}

/**
 * Send request to restart a resource
 */
async function restartResource(
  resourceName: string,
  config: ReloaderConfig
): Promise<boolean> {
  return new Promise((resolve) => {
    // Log the request details for debugging
    console.log(
      `Attempting to restart resource '${resourceName}' via ${config.host}:${config.port}`
    );

    const options = {
      hostname: config.host,
      port: config.port,
      path: `/restart?resource=${encodeURIComponent(resourceName)}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(
              `Resource '${resourceName}' reloaded: ${
                response.success ? 'success' : 'failed'
              }`,
              response
            );
            resolve(response.success);
          } catch (error) {
            console.error('Error parsing restart response:', error);
            resolve(false);
          }
        } else {
          console.error(
            `Failed to restart resource ${resourceName}: HTTP ${res.statusCode}, Response: ${data}`
          );
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error(
        `Error sending restart request for ${resourceName}:`,
        error
      );
      resolve(false);
    });

    req.end();
  });
}

/**
 * Function to restart all resources
 */
async function restartAllResources(config: ReloaderConfig): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(
      `Attempting to restart all resources via ${config.host}:${config.port}`
    );

    const options = {
      hostname: config.host,
      port: config.port,
      path: '/restart', // No resource parameter means restart all
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(
              `All resources reloaded: ${
                response.success ? 'success' : 'failed'
              }`,
              response
            );
            resolve(response.success);
          } catch (error) {
            console.error('Error parsing restart all response:', error);
            resolve(false);
          }
        } else {
          console.error(
            `Failed to restart all resources: HTTP ${res.statusCode}, Response: ${data}`
          );
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Error sending restart all request:`, error);
      resolve(false);
    });

    req.end();
  });
}

/**
 * Set up file watching for plugins
 */
function setupWatcher(
  plugins: any[],
  corePlugins: any[],
  distDir: string,
  pluginsDir: string,
  coreDir: string,
  autoReload: boolean = false
) {
  // Get resource reloader configuration if auto-reload is enabled
  const reloaderConfig = autoReload ? getReloaderConfig() : null;
  const allPlugins = [...plugins, ...corePlugins];
  const paths = [pluginsDir, coreDir];

  console.log('Watching for file changes...');

  const watcher = chokidar.watch(paths, {
    ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher.on('change', async (filePath) => {
    console.log(`File changed: ${filePath}`);
    const plugin = findPluginByPath(allPlugins, filePath);

    if (plugin) {
      console.log(`Rebuilding plugin: ${plugin.name}`);

      // Reset plugin files to force re-scanning
      plugin.files = [];

      try {
        const result = await buildPlugin(plugin, distDir);
        if (!result) return;

        const { updatedPluginJson, manifestPath } = result;

        if (plugin.hasHtml) {
          updatedPluginJson.ui_page = 'html/index.html';
          updatedPluginJson.files?.length
            ? updatedPluginJson.files.push('html/**/*')
            : (updatedPluginJson.files = ['html/**/*']);

          updatedPluginJson.dependencies?.length
            ? updatedPluginJson.dependencies.push('webview')
            : (updatedPluginJson.dependencies = ['webview']);
        }

        generateManifest(updatedPluginJson, manifestPath);

        // If webview related file changed, rebuild webview
        if (filePath.includes('webview') || plugin.hasHtml) {
          await buildWebview([plugin], distDir);
          await generatePluginHtmlFiles([plugin], distDir);
        }

        console.log(`Plugin ${plugin.name} rebuilt successfully`);

        // Trigger resource reload if enabled
        if (reloaderConfig?.enabled) {
          try {
            // Make sure we're using a name that actually exists in FiveM
            // Some plugins have folder structures like [misc2]/example3
            // but the actual resource name is just "example3"
            const resourceName = plugin.name.includes('/')
              ? plugin.name.split('/').pop()
              : plugin.name;

            console.log(`Triggering reload for resource: ${resourceName}`);
            const reloadSuccess = await restartResource(
              resourceName,
              reloaderConfig
            );
            if (reloadSuccess) {
              console.log(`Resource ${resourceName} reloaded successfully`);
            } else {
              console.log(
                `Resource ${resourceName} reload failed, trying to restart all resources...`
              );
              // Fallback to restarting all resources if specific resource restart fails
              await restartAllResources(reloaderConfig);
            }
          } catch (reloadError) {
            console.error(
              `Failed to reload resource ${plugin.name}:`,
              reloadError
            );
          }
        }
      } catch (error) {
        console.error(`Error rebuilding plugin ${plugin.name}:`, error);
      }
    } else if (filePath.includes('webview')) {
      // If it's a webview file but not part of a specific plugin
      console.log('Rebuilding webview...');
      try {
        await buildWebview(plugins, distDir);
        console.log('Webview rebuilt successfully');
      } catch (error) {
        console.error('Error rebuilding webview:', error);
      }
    }
  });

  watcher.on('add', (filePath) => {
    console.log(`New file detected: ${filePath}`);
    // If it's a new file, we'll do a full rebuild of the affected plugin
    const plugin = findPluginByPath(allPlugins, filePath);
    if (plugin) {
      console.log(
        `Scheduling rebuild for plugin: ${plugin.name} due to new file`
      );
      // Reset plugin files to force re-scanning
      plugin.files = [];
      // We'll let the 'change' handler above actually do the rebuild
      watcher.emit('change', filePath);
    }
  });

  watcher.on('unlink', (filePath) => {
    console.log(`File deleted: ${filePath}`);
    const plugin = findPluginByPath(allPlugins, filePath);
    if (plugin) {
      console.log(
        `Scheduling rebuild for plugin: ${plugin.name} due to deleted file`
      );
      // Reset plugin files to force re-scanning
      plugin.files = [];
      // We'll let the 'change' handler do the rebuild
      watcher.emit('change', filePath);
    }
  });

  console.log('Watcher initialized. Press Ctrl+C to stop.');

  return watcher;
}

/**
 * Main build function
 */
async function main() {
  const { watch, reload } = parseArgs();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const pluginsDir = path.join(__dirname, '../plugins');
  const rootDir = path.join(__dirname, '../../');
  const distDir = path.join(rootDir, 'dist');

  const coreDir = path.join(pluginsDir, '../core');

  // Ensure dist directory exists
  await ensureDirectoryExists(distDir);
  await ensureDirectoryExists(coreDir);

  // Get plugin directories
  const { pluginPaths } = getPluginsPaths(pluginsDir);
  const { pluginPaths: corePluginPaths } = getPluginsPaths(coreDir);

  // Parse plugin paths into plugin objects
  const plugins = parsePluginPathsIntoPlugins(pluginPaths);
  const corePlugins = parsePluginPathsIntoPlugins(corePluginPaths);

  console.log(
    `Found ${plugins.length} plugins and ${corePlugins.length} core plugins`
  );

  await buildWebview(plugins, distDir);

  // write the webview fx manifest
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

  // Generate HTML files for plugins with Page.tsx
  await generatePluginHtmlFiles(plugins, distDir);

  // Process each plugin
  for (const plugin of plugins) {
    const result = await buildPlugin(plugin, distDir);
    if (!result) continue;
    const { updatedPluginJson, manifestPath } = result;
    if (plugin.hasHtml) {
      updatedPluginJson.ui_page = 'html/index.html';
      updatedPluginJson.files?.length
        ? updatedPluginJson.files.push('html/**/*')
        : (updatedPluginJson.files = ['html/**/*']);

      updatedPluginJson.dependencies?.length
        ? updatedPluginJson.dependencies.push('webview')
        : (updatedPluginJson.dependencies = ['webview']);
    }

    generateManifest(updatedPluginJson, manifestPath);
  }

  for (const plugin of corePlugins) {
    const result = await buildPlugin(plugin, distDir); // Pass distDir for core plugins as well
    if (!result) continue;
    const { updatedPluginJson, manifestPath } = result;
    generateManifest(updatedPluginJson, manifestPath);
  }

  console.log('Build completed successfully!');

  await moveBuiltResources(distDir);

  // Set up watcher if watch mode is enabled
  if (watch) {
    setupWatcher(plugins, corePlugins, distDir, pluginsDir, coreDir, reload);

    if (reload) {
      console.log(
        'Auto-reload is enabled. Resources will be reloaded automatically when rebuilt.'
      );
    }
  }
}

// Run the build process
main().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
