import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar'; // Add chokidar import for file watching

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
 * Set up file watching for plugins
 */
function setupWatcher(
  plugins: any[],
  corePlugins: any[],
  distDir: string,
  pluginsDir: string,
  coreDir: string
) {
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
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    watch: args.includes('--watch') || args.includes('-w'),
  };
}

/**
 * Main build function
 */
async function main() {
  const { watch } = parseArgs();

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
    setupWatcher(plugins, corePlugins, distDir, pluginsDir, coreDir);
  }
}

// Run the build process
main().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
