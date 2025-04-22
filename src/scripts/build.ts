import * as path from 'path';

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
} from './utils/file';
import { generateManifest, preparePluginManifestData } from './utils/manifest';
import { verifyOutputDir } from './utils/bundler';

/**
 * Build a single plugin
 */
async function buildPlugin(plugin: any, distDir: string) {
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

  console.log(
    `Final manifest configuration:`,
    JSON.stringify(updatedPluginJson, null, 2)
  );

  // Generate the manifest with the updated file paths
  generateManifest(updatedPluginJson, manifestPath);

  // Verify the output directory content
  await verifyOutputDir(outputDir);

  console.log(`Successfully built plugin: ${plugin.pathFromPluginsDir}`);

  return generatedFiles;
}

/**
 * Main build function
 */
async function main() {
  const pluginsDir = path.join(__dirname, '../plugins');
  const rootDir = path.join(__dirname, '../../');
  const distDir = path.join(rootDir, 'dist');

  const coreDir = path.join(__dirname, '../core');

  // Ensure dist directory exists
  await ensureDirectoryExists(distDir);
  await ensureDirectoryExists(coreDir);

  // Get plugin directories
  const { pluginPaths } = getPluginsPaths(pluginsDir);
  const { pluginPaths: corePluginPaths } = getPluginsPaths(coreDir);

  // Parse plugin paths into plugin objects
  const plugins = parsePluginPathsIntoPlugins(pluginPaths);
  const corePlugins = parsePluginPathsIntoPlugins(corePluginPaths);
  console.log('CACAT: ', [...plugins, ...corePlugins]);
  // Process each plugin
  for (const plugin of [...plugins, ...corePlugins]) {
    await buildPlugin(plugin, distDir);
  }

  console.log('Build completed successfully!');
}

// Run the build process
main().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
