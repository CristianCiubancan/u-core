import * as path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import * as fs from 'fs';

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

// Set up directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = path.join(__dirname, '../plugins');
const rootDir = path.join(__dirname, '../../');
const distDir = path.join(rootDir, 'dist');
const coreDir = path.join(pluginsDir, '../core');

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
    return;
  }

  // Get plugin output info
  const { outputDir, manifestPath } = getPluginOutputInfo(plugin, distDir);

  // Ensure output directory exists
  await ensureDirectoryExists(outputDir);

  // Read plugin.json
  const jsonPath = path.join(plugin.fullPath, 'plugin.json');
  const pluginJsonData = readPluginJson(jsonPath);

  // Get the files for this plugin
  const pluginFiles = parseFilePathsIntoFiles(plugin.fullPath);
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
 * Builds all plugins
 */
async function buildAllPlugins() {
  console.log('\n🔨 Starting build process...');
  const startTime = Date.now();

  try {
    // Ensure dist directory exists
    await ensureDirectoryExists(distDir);
    await ensureDirectoryExists(coreDir);

    // Get plugin directories
    const { pluginPaths } = getPluginsPaths(pluginsDir);
    const { pluginPaths: corePluginPaths } = getPluginsPaths(coreDir);

    // Parse plugin paths into plugin objects
    const plugins = parsePluginPathsIntoPlugins(pluginPaths);
    const corePlugins = parsePluginPathsIntoPlugins(corePluginPaths);

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
      const result = await buildPlugin(plugin, distDir);
      if (!result) continue;
      const { updatedPluginJson, manifestPath } = result;
      generateManifest(updatedPluginJson, manifestPath);
    }

    await moveBuiltResources(distDir);

    const endTime = Date.now();
    const buildTime = (endTime - startTime) / 1000;
    console.log(`✅ Build completed successfully in ${buildTime.toFixed(2)}s!`);

    return true;
  } catch (error) {
    console.error('❌ Build failed:', error);
    return false;
  }
}

/**
 * Watch for file changes and trigger rebuilds
 */
async function watchAndRebuild() {
  console.log('👀 Starting development mode...');
  console.log(`📁 Watching for changes in ${pluginsDir}`);

  // Initial build
  await buildAllPlugins();

  // Set up watcher
  const watcher = chokidar.watch(
    [path.join(pluginsDir, '**/*'), path.join(coreDir, '**/*')],
    {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    }
  );

  // Debounce function to prevent multiple rebuilds
  let debounceTimer: NodeJS.Timeout | null = null;
  let isBuilding = false;

  const debouncedRebuild = async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (isBuilding) return;

    debounceTimer = setTimeout(async () => {
      console.log('\n🔄 Changes detected, rebuilding...');
      isBuilding = true;
      await buildAllPlugins();
      isBuilding = false;
    }, 500);
  };

  // Watch events
  watcher
    .on('add', (filePath) => {
      console.log(`📄 File added: ${path.relative(rootDir, filePath)}`);
      debouncedRebuild();
    })
    .on('change', (filePath) => {
      console.log(`📝 File changed: ${path.relative(rootDir, filePath)}`);
      debouncedRebuild();
    })
    .on('unlink', (filePath) => {
      console.log(`🗑️ File removed: ${path.relative(rootDir, filePath)}`);
      debouncedRebuild();
    });

  console.log('\n⚡ Dev server running! Press Ctrl+C to stop.');
}

// Run the development server
watchAndRebuild().catch((error) => {
  console.error('Dev server failed:', error);
  process.exit(1);
});
