import * as path from 'path';
import * as fs from 'fs';
import {
  getPluginsPaths,
  getFilePaths,
  parseFilePathsIntoFiles,
  parsePluginPathsIntoPlugins,
} from './utils/file';
import { generateManifest } from './utils/manifest';

const pluginsDir = path.join(__dirname, '../plugins');
const rootDir = path.join(__dirname, '../../');

// Get all files in the plugins directory
const allPluginFiles = getFilePaths(pluginsDir);
console.log('Found the following plugin files:', allPluginFiles);

// Get plugin directories
const { pluginPaths } = getPluginsPaths(pluginsDir);
console.log('Found the following plugin directories:', pluginPaths);

// Pass the plugins directory to ensure correct relative path calculation
const plugins = parsePluginPathsIntoPlugins(pluginPaths);

// Process files for each plugin
for (const plugin of plugins) {
  if (!plugin.fullPath) {
    console.log(`Skipping plugin ${plugin.name} as it has no fullPath`);
    continue;
  }

  // Get the files for this plugin
  const pluginFiles = parseFilePathsIntoFiles(plugin.fullPath);
  console.log(`Found ${pluginFiles.length} files for plugin ${plugin.name}`);

  // Add all files to the plugin
  plugin.files.push(...pluginFiles);

  // Generate manifest file for this plugin
  const manifestPath = path.join(
    rootDir,
    'dist',
    plugin.pathFromPluginsDir,
    'fxmanifest.lua'
  );

  const parsedPluginJsonFileData = JSON.parse(
    fs.readFileSync(path.join(plugin.fullPath, 'plugin.json'), 'utf8')
  );

  generateManifest(parsedPluginJsonFileData, manifestPath);
  console.log(
    `Generated manifest for plugin ${plugin.name} at ${manifestPath}`
  );
}

console.log('Found the following plugins:', JSON.stringify(plugins, null, 2));

// Optional: Export to a summary file
// const summaryPath = path.join(__dirname, '../plugins-summary.json');
// fs.writeFileSync(summaryPath, JSON.stringify(plugins, null, 2));
// console.log(`Saved plugins summary to ${summaryPath}`);
