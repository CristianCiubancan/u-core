import * as path from 'path';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import {
  getPluginScripts,
  getPluginsPaths,
  parseFilePathsIntoFiles,
  parsePluginPathsIntoPlugins,
} from './utils/file';
import { generateManifest } from './utils/manifest';
import {
  bundleTypeScript,
  bundleJavaScript,
  copyLuaFile,
  verifyOutputDir,
} from './utils/bundler';

// Main build function
async function main() {
  const pluginsDir = path.join(__dirname, '../plugins');
  const rootDir = path.join(__dirname, '../../');
  const distDir = path.join(rootDir, 'dist/plugins');

  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

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
    console.log(
      `Updated plugin config:`,
      JSON.stringify(updatedPluginJson, null, 2)
    );

    // Generate manifest file for this plugin using the updated patterns
    const manifestPath = path.join(
      rootDir,
      'dist',
      plugin.pathFromPluginsDir,
      'fxmanifest.lua'
    );

    // Build plugin files
    await buildPluginFiles(plugin, scriptFiles, distDir);

    generateManifest(updatedPluginJson, manifestPath);
  }
}

// Execute the main function
main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

/**
 * Build plugin files by processing each file according to its type
 */
async function buildPluginFiles(plugin, scriptFiles, distDir) {
  // Determine if path already contains 'plugins' prefix
  const pathContainsPluginsPrefix =
    plugin.pathFromPluginsDir.startsWith('plugins');

  // Create the output directory path, avoiding double 'plugins' in the path
  const relativePath = pathContainsPluginsPrefix
    ? plugin.pathFromPluginsDir
    : path.join('plugins', plugin.pathFromPluginsDir);

  // Use the path without the root distDir (which already includes 'plugins')
  const pluginRelativePath = pathContainsPluginsPrefix
    ? plugin.pathFromPluginsDir.substring('plugins/'.length)
    : plugin.pathFromPluginsDir;

  const outputDir = path.join(distDir, pluginRelativePath);

  console.log(`\nBuilding plugin files to: ${outputDir}`);

  // Ensure output directory exists
  try {
    await fsPromises.mkdir(outputDir, { recursive: true });
    console.log(`Created/verified output directory: ${outputDir}`);
  } catch (err) {
    console.error(`Error creating output directory ${outputDir}:`, err);
    throw err;
  }

  // Ensure output directory exists
  await fsPromises.mkdir(outputDir, { recursive: true });

  // Process all files in the plugin
  for (const file of plugin.files) {
    // Skip plugin.json as it's already processed for manifest generation
    if (file.isPluginJsonFile) {
      continue;
    }

    const fileExt = path.extname(file.name).toLowerCase();
    const outputPath = path.join(outputDir, file.pathFromPluginDir);

    // Ensure output directory for this file exists
    try {
      await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
      console.log(
        `Created/verified directory for: ${path.dirname(outputPath)}`
      );
    } catch (err) {
      console.error(`Error creating directory for ${outputPath}:`, err);
      throw err;
    }

    try {
      switch (fileExt) {
        case '.ts':
          // Skip .d.ts files
          if (file.name.endsWith('.d.ts')) {
            continue;
          }

          // For TSX files (React components), use a different approach if needed
          if (file.name.endsWith('.tsx')) {
            await bundleTypeScript(
              file.fullPath,
              outputPath.replace('.tsx', '.js'),
              true
            );
          } else {
            await bundleTypeScript(
              file.fullPath,
              outputPath.replace('.ts', '.js')
            );
          }
          break;
        case '.js':
          await bundleJavaScript(file.fullPath, outputPath);
          break;
        case '.lua':
          await copyLuaFile(file.fullPath, outputPath);
          break;
        default:
          // Copy other files directly (e.g., .json, .html, etc.)
          await fsPromises.copyFile(file.fullPath, outputPath);
          break;
      }
    } catch (err) {
      console.error(`Error processing file ${file.fullPath}:`, err);
    }
  }

  console.log(`Successfully built plugin: ${plugin.pathFromPluginsDir}`);

  // Verify the output directory content
  await verifyOutputDir(outputDir);
}
