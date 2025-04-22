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

  console.log(
    `Generating manifest for ${JSON.stringify(
      parsedPluginJsonFileData,
      null,
      2
    )}`
  );

  // Get all script files for this plugin
  const scriptFiles = getPluginScripts(
    plugin.fullPath,
    parsedPluginJsonFileData
  );

  // Create updated plugin configuration with detected file patterns
  const updatedPluginJson = { ...parsedPluginJsonFileData };

  // Update the plugin JSON with actual patterns that match files (if you want to save these changes)
  if (scriptFiles.client.length > 0) {
    // Create patterns based on actual file extensions
    const extensions = new Set(
      scriptFiles.client.map((file) => path.extname(file))
    );
    updatedPluginJson.client_scripts = Array.from(extensions)
      .filter((ext) => ext !== '')
      .map((ext) => `client/*${ext}`);
  }

  if (scriptFiles.server.length > 0) {
    // Create patterns based on actual file extensions
    const extensions = new Set(
      scriptFiles.server.map((file) => path.extname(file))
    );
    updatedPluginJson.server_scripts = Array.from(extensions)
      .filter((ext) => ext !== '')
      .map((ext) => `server/*${ext}`);
  }

  if (scriptFiles.shared.length > 0) {
    // Create patterns based on actual file extensions
    const extensions = new Set(
      scriptFiles.shared.map((file) => path.extname(file))
    );
    updatedPluginJson.shared_scripts = Array.from(extensions)
      .filter((ext) => ext !== '')
      .map((ext) => `shared/*${ext}`);
  }

  // Generate manifest file for this plugin using the updated patterns
  const manifestPath = path.join(
    rootDir,
    'dist',
    plugin.pathFromPluginsDir,
    'fxmanifest.lua'
  );

  generateManifest(updatedPluginJson, manifestPath);
}
