import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';

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

/**
 * Build a single plugin
  categorizeGeneratedFiles,
  ensureDirectoryExists,
  getPluginOutputInfo,
  getPluginScripts,
  getPluginsPaths,
  parseFilePathsIntoFiles,
  parsePluginPathsIntoPlugins,
  processFile,
  readPluginJson,
} from './utils/file';
import { generateManifest, preparePluginManifestData } from './utils/manifest';
import { verifyOutputDir } from './utils/bundler';

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

  // Get plugin output info
  const { outputDir, manifestPath } = getPluginOutputInfo(plugin, distDir);

  console.log(`\nBuilding plugin files to: ${outputDir}`);

  // Ensure output directory exists
  await ensureDirectoryExists(outputDir);

  // Read plugin.json
  const jsonPath = path.join(plugin.fullPath, 'plugin.json');
  const pluginJsonData = readPluginJson(jsonPath);

  // Get the files for this plugin
  const pluginFiles = parseFilePathsIntoFiles(plugin.fullPath);
  plugin.files.push(...pluginFiles);

  console.log(`Plugin files:`, JSON.stringify(plugin.files, null, 2));

  // Get script files based on patterns in plugin.json
  const scriptFiles = getPluginScripts(pluginJsonData, plugin.fullPath);
  console.log(`Detected script files:`, JSON.stringify(scriptFiles, null, 2));

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

  console.log(
    `Final manifest configuration:`,
    JSON.stringify(updatedPluginJson, null, 2)
  );

  // Generate the manifest with the updated file paths

  // Verify the output directory content
  await verifyOutputDir(outputDir);

  console.log(`Successfully built plugin: ${plugin.pathFromPluginsDir}`);

  return { updatedPluginJson, manifestPath };
}

/**
 * Main build function
 */
async function main() {
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
  // Parse plugin paths into plugin objects

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
}

// Run the build process
main().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
