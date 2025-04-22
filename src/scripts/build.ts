import * as path from 'path';
import * as fs from 'fs';
import {
  getPluginScripts,
  getPluginsPaths,
  parseFilePathsIntoFiles,
  parsePluginPathsIntoPlugins,
} from './utils/file';
import { generateManifest } from './utils/manifest';

const pluginsDir = path.join(__dirname, '../plugins');
const rootDir = path.join(__dirname, '../../');

// Get plugin directories
const { pluginPaths } = getPluginsPaths(pluginsDir);

// Pass the plugins directory to ensure correct relative path calculation
const plugins = parsePluginPathsIntoPlugins(pluginPaths);

// Process files for each plugin
for (const plugin of plugins) {
  if (!plugin.fullPath) {
    continue;
  }

  // Get the files for this plugin
  const pluginFiles = parseFilePathsIntoFiles(plugin.fullPath);

  // Add all files to the plugin
  plugin.files.push(...pluginFiles);

  // Read plugin.json
  const jsonPath = path.join(plugin.fullPath, 'plugin.json');
  const pluginJsonContent = fs.readFileSync(jsonPath, 'utf8');
  const parsedPluginJsonFileData = JSON.parse(pluginJsonContent);

  console.log(`Plugin files:`, JSON.stringify(plugin.files, null, 2));

  // Get script files based on patterns in plugin.json
  const scriptFiles = getPluginScripts(
    parsedPluginJsonFileData,
    plugin.fullPath
  );

  // Log the detected script files (optional but helpful for debugging)
  console.log(`Detected script files:`, JSON.stringify(scriptFiles, null, 2));

  console.log(
    `Generating manifest for ${JSON.stringify(
      parsedPluginJsonFileData,
      null,
      2
    )}`
  );

  // Create updated plugin configuration with detected file patterns
  const updatedPluginJson = {
    ...parsedPluginJsonFileData,
    // Optionally update the script patterns with the actual resolved files
    // This is useful if your manifest generation uses the actual file list
    _resolvedClientScripts: scriptFiles.client,
    _resolvedServerScripts: scriptFiles.server,
    _resolvedSharedScripts: scriptFiles.shared,
  };

  // Generate manifest file for this plugin using the updated patterns
  const manifestPath = path.join(
    rootDir,
    'dist',
    plugin.pathFromPluginsDir,
    'fxmanifest.lua'
  );

  generateManifest(updatedPluginJson, manifestPath);
}
