import * as path from 'path';
import {
  getPluginsPaths,
  getFilePaths,
  parseFilePathsIntoFiles,
  parsePluginPathsIntoPlugins,
  Plugin,
  File,
} from './utils';

const pluginsDir = path.join(__dirname, '../plugins');

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
    continue;
  }

  // Get the files for this plugin
  const pluginFiles = parseFilePathsIntoFiles(plugin.fullPath);
  console.log(`Found ${pluginFiles.length} files for plugin ${plugin.name}`);

  // Add all files to the plugin
  plugin.files.push(...pluginFiles);
}

console.log('Found the following plugins:', plugins);
