/**
 * Build-related functions
 */
import * as path from 'path';
import * as fs from 'fs';
import { Plugin } from './file.js';
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
} from './file.js';
import { generateManifest, preparePluginManifestData } from './manifest.js';
import { verifyOutputDir } from './bundler.js';
import { buildPluginWebview } from './webview.js';
import { ResourceManagerImpl } from '../core/resources/ResourceManager.js';
import { ConsoleLogger } from './logger/ConsoleLogger.js';
import { getProjectPaths } from './paths.js';

/**
 * Plugin build result
 */
export interface PluginBuildResult {
  updatedPluginJson: Record<string, any>;
  manifestPath: string;
}

/**
 * Check if a plugin has HTML content (Page.tsx)
 * @param plugin The plugin to check
 * @returns Promise<boolean> True if the plugin has HTML content
 */
export async function checkForHtmlContent(plugin: Plugin): Promise<boolean> {
  if (!plugin.fullPath) return false;

  const htmlDir = path.join(plugin.fullPath, 'html');
  const pageTsxPath = path.join(htmlDir, 'Page.tsx');

  try {
    await fs.promises.access(htmlDir);
    try {
      await fs.promises.access(pageTsxPath);
      return true;
    } catch {
      // Page.tsx doesn't exist
      return false;
    }
  } catch {
    // html directory doesn't exist
    return false;
  }
}

/**
 * Build a single plugin
 */
export async function buildPlugin(
  plugin: Plugin,
  distDir: string
): Promise<PluginBuildResult | undefined> {
  if (!plugin.fullPath) {
    console.log(`Skipping plugin with no path: ${plugin.name || 'unknown'}`);
    return;
  }

  console.log(`Building plugin: ${plugin.name}`);

  try {
    // Get plugin output info
    const { outputDir, manifestPath } = getPluginOutputInfo(plugin, distDir);

    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);

    // Read plugin.json
    const jsonPath = path.join(plugin.fullPath, 'plugin.json');

    const pluginJsonData = readPluginJson(jsonPath);

    // If plugin.json is not found, skip this plugin
    if (pluginJsonData === null) {
      console.warn(
        `Plugin ${plugin.name} does not have a plugin.json file, skipping`
      );
      return undefined;
    }

    // Get the files for this plugin
    const pluginFiles = parseFilePathsIntoFiles(plugin.fullPath);
    plugin.files = plugin.files || [];
    plugin.files.push(...pluginFiles);

    // Check if plugin has HTML content to build webview
    // This should be determined by checking if there's a 'html' directory with a Page.tsx file
    plugin.hasHtml = plugin.hasHtml || (await checkForHtmlContent(plugin));

    // Build the webview first if the plugin has HTML content
    // This way, we can include the webview assets in the manifest
    if (plugin.hasHtml && plugin.fullPath) {
      try {
        const webviewResult = await buildPluginWebview(plugin, distDir);

        if (webviewResult.success) {
          console.log(
            `Webview built successfully at: ${webviewResult.htmlDir}`
          );

          // Check if the html directory exists and contains files
          const htmlDir = path.join(outputDir, 'html');
          if (fs.existsSync(htmlDir)) {
            // Add html/**/* to the files array in the plugin.json data
            if (!pluginJsonData.files) {
              pluginJsonData.files = ['html/**/*'];
            } else if (!pluginJsonData.files.includes('html/**/*')) {
              pluginJsonData.files.push('html/**/*');
            }

            // Set the ui_page in the plugin.json data
            pluginJsonData.ui_page = 'html/index.html';

            // Log detailed information about what's being included in the manifest
            console.log(
              `Including webview assets in plugin.json for ${plugin.name}:`
            );
            console.log(`  - Added 'html/**/*' to files array`);
            console.log(`  - Set ui_page to 'html/index.html'`);
          } else {
            console.warn(
              `Webview build for plugin ${plugin.name} succeeded but html directory not found at ${htmlDir}.`
            );
            console.warn(`Not including webview assets in manifest.`);
          }
        } else {
          console.warn(
            `Webview build for plugin ${plugin.name} did not produce expected files.`
          );
          console.warn(`Not including webview assets in manifest.`);
        }
      } catch (error) {
        console.error(
          `Error building webview for plugin ${plugin.name}:`,
          error
        );
        // Continue with the build even if webview fails
      }
    }

    // Get script files based on patterns in plugin.json
    const scriptFiles = getPluginScripts(pluginJsonData, plugin.fullPath);

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

    // Verify the output directory content
    await verifyOutputDir(outputDir);

    return { updatedPluginJson, manifestPath };
  } catch (error) {
    console.error(`Error building plugin ${plugin.name}:`, error);
    return undefined;
  }
}

/**
 * Build plugins and generate manifests
 */
export async function buildAndGenerateManifests(
  plugins: Plugin[],
  distDir: string
) {
  for (const plugin of plugins) {
    const result = await buildPlugin(plugin, distDir);
    if (!result) continue;
    const { updatedPluginJson, manifestPath } = result;

    // Generate manifest with the updated plugin JSON data
    generateManifest(updatedPluginJson, manifestPath);
  }
}

/**
 * Main build function to build all plugins and resources
 */
export async function build() {
  const { pluginsDir, coreDir, distDir } = getProjectPaths();

  try {
    await ensureDirectoryExists(distDir);
    await ensureDirectoryExists(coreDir);

    const { pluginPaths } = getPluginsPaths(pluginsDir);
    const { pluginPaths: corePluginPaths } = getPluginsPaths(coreDir);

    const plugins = parsePluginPathsIntoPlugins(pluginPaths);
    const corePlugins = parsePluginPathsIntoPlugins(corePluginPaths);

    console.log(
      `Found ${plugins.length} plugins and ${corePlugins.length} core plugins`
    );

    // Build order:
    // 1. Build core plugins first
    console.log('Building core plugins...');
    await buildAndGenerateManifests(corePlugins, distDir);

    // 2. Build regular plugins
    console.log('Building regular plugins...');
    await buildAndGenerateManifests(plugins, distDir);

    // 3. Generate webview manifest if needed
    const webviewDir = path.join(distDir, 'webview');
    if (fs.existsSync(webviewDir)) {
      console.log('Generating webview manifest...');
      generateManifest(
        {
          name: 'webview',
          version: '0.1.0',
          fx_version: 'cerulean',
          author: 'Baloony Gaze',
          games: ['gta5', 'rdr3'],
          description: 'Shared webview assets',
          files: ['index.html', 'assets/**/*'],
        },
        path.join(webviewDir, 'fxmanifest.lua')
      );
    }

    console.log('Build completed successfully!');

    // 4. Deploy built resources
    const logger = new ConsoleLogger();
    const resourceManager = new ResourceManagerImpl(undefined, logger, {
      reloaderEnabled: process.env.RELOADER_ENABLED === 'true',
      reloaderHost: process.env.RELOADER_HOST || 'localhost',
      reloaderPort: parseInt(process.env.RELOADER_PORT || '3414', 10),
      reloaderApiKey: process.env.RELOADER_API_KEY || 'your-secure-api-key',
    });
    await resourceManager.deployResources(distDir);

    return { plugins, corePlugins };
  } catch (error) {
    console.error('Build failed:', error);
    throw error;
  }
}

/**
 * Rebuild component wrapper to handle common tasks
 */
export async function rebuildComponent(
  componentType: 'plugin' | 'core' | 'webview',
  pluginDir?: string
) {
  console.log(
    `Rebuilding ${componentType}${pluginDir ? `: ${pluginDir}` : ''}`
  );
  global.isBuilding = true;

  try {
    const { coreDir, distDir } = getProjectPaths();

    switch (componentType) {
      case 'plugin': {
        if (!pluginDir) throw new Error('Plugin directory is required');
        const { pluginPaths } = getPluginsPaths(path.dirname(pluginDir));
        const plugins = parsePluginPathsIntoPlugins(
          pluginPaths.filter((p) => p === pluginDir)
        );
        await buildAndGenerateManifests(plugins, distDir);
        break;
      }
      case 'core': {
        const { pluginPaths } = getPluginsPaths(coreDir);
        const corePlugins = parsePluginPathsIntoPlugins(pluginPaths);
        await buildAndGenerateManifests(corePlugins, distDir);
        break;
      }
      case 'webview': {
        // If we need to rebuild webview assets, we would handle that here
        // For now, just log that we don't have a specific handler
        console.log(
          'Webview rebuild requested, but no specific handler implemented'
        );
        break;
      }
    }

    // Check if we need to generate a webview manifest
    const webviewDir = path.join(distDir, 'webview');
    if (fs.existsSync(webviewDir)) {
      console.log('Generating webview manifest...');
      generateManifest(
        {
          name: 'webview',
          version: '0.1.0',
          fx_version: 'cerulean',
          author: 'Baloony Gaze',
          games: ['gta5', 'rdr3'],
          description: 'Shared webview assets',
          files: ['index.html', 'assets/**/*'],
        },
        path.join(webviewDir, 'fxmanifest.lua')
      );
    }

    // Deploy built resources
    const logger = new ConsoleLogger();
    const resourceManager = new ResourceManagerImpl(undefined, logger, {
      reloaderEnabled: process.env.RELOADER_ENABLED === 'true',
      reloaderHost: process.env.RELOADER_HOST || 'localhost',
      reloaderPort: parseInt(process.env.RELOADER_PORT || '3414', 10),
      reloaderApiKey: process.env.RELOADER_API_KEY || 'your-secure-api-key',
    });
    await resourceManager.deployResources(distDir);
  } catch (error) {
    console.error(`Error rebuilding ${componentType}:`, error);
  } finally {
    global.isBuilding = false;
  }
}
