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

  // Track what files we're actually creating in the output directory
  const generatedFiles: {
    client: string[];
    server: string[];
    shared: string[];
  } = {
    client: [],
    server: [],
    shared: [],
  };

  // Process all files in the plugin
  for (const file of plugin.files) {
    // Skip plugin.json as it's already processed for manifest generation
    if (file.isPluginJsonFile) {
      continue;
    }

    const fileExt = path.extname(file.name).toLowerCase();
    const outputPath = path.join(outputDir, file.pathFromPluginDir);
    const outputPathWithCorrectExt = outputPath.replace(/\.(ts|tsx)$/, '.js');

    // Determine which script category this file belongs to (client, server, shared)
    const category = getFileCategory(file.pathFromPluginDir);

    // If this is a valid category, track the file
    if (category) {
      // We'll track the output path (with correct extension) instead of the source path
      const relativePath = path.relative(outputDir, outputPathWithCorrectExt);
      // Use type assertion to tell TypeScript that category is a valid key
      generatedFiles[category as keyof typeof generatedFiles].push(
        relativePath
      );
    }

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

  // Return the list of generated files for the manifest
  return generatedFiles;
}

/**
 * Helper function to determine which category a file belongs to
 */
function getFileCategory(
  filePath: string
): 'client' | 'server' | 'shared' | null {
  if (filePath.startsWith('client/')) {
    return 'client';
  } else if (filePath.startsWith('server/')) {
    return 'server';
  } else if (filePath.startsWith('shared/')) {
    return 'shared';
  }
  return null;
}

// Update the main function to use the generated files in the manifest
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

    // Create initial updated plugin configuration with detected file patterns
    let updatedPluginJson = {
      ...parsedPluginJsonFileData,
      // Store the resolved patterns for reference
      _resolvedClientScripts: scriptFiles.client,
      _resolvedServerScripts: scriptFiles.server,
      _resolvedSharedScripts: scriptFiles.shared,
    };

    console.log(
      `Updated plugin config:`,
      JSON.stringify(updatedPluginJson, null, 2)
    );

    // Build plugin files and get the list of generated files
    const manifestPath = path.join(
      rootDir,
      'dist',
      plugin.pathFromPluginsDir,
      'fxmanifest.lua'
    );

    // Build the plugin files and get back what was actually generated
    const generatedFiles = await buildPluginFiles(plugin, scriptFiles, distDir);

    // Now update the plugin config with the correct output files (instead of source files)
    // Replace the patterns with the actual generated files for the manifest
    updatedPluginJson = {
      ...updatedPluginJson,
      client_scripts:
        generatedFiles.client.length > 0
          ? generatedFiles.client
          : parsedPluginJsonFileData.client_scripts,
      server_scripts:
        generatedFiles.server.length > 0
          ? generatedFiles.server
          : parsedPluginJsonFileData.server_scripts,
      shared_scripts:
        generatedFiles.shared.length > 0
          ? generatedFiles.shared
          : parsedPluginJsonFileData.shared_scripts,
    };

    console.log(
      `Final manifest configuration:`,
      JSON.stringify(updatedPluginJson, null, 2)
    );

    // Generate the manifest with the updated file paths
    generateManifest(updatedPluginJson, manifestPath);
  }
}

main();
