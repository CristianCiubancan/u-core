/**
 * PluginBuilder class for building plugins
 */
import * as path from 'path';
import * as fs from 'fs';
import { Plugin } from '../../core/types.js';
import { fileSystem, ResourceManager } from '../fs/index.js';
import { PluginUtils } from '../fs/PluginUtils.js';
import {
  generateManifest,
  preparePluginManifestData,
} from '../fs/ConfigUtils.js';
import { bundlerService } from '../bundler/index.js';
import { webviewBuilder } from '../webview/index.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import { getProjectPaths } from '../fs/PathUtils.js';
import { scriptProcessor } from '../fs/ScriptProcessor.js';
import { Logger } from '../../core/types.js';

/**
 * Plugin build result
 */
export interface PluginBuildResult {
  updatedPluginJson: Record<string, any>;
  manifestPath: string;
}

/**
 * Builder for plugins
 */
export class PluginBuilder {
  private logger: Logger;
  private pluginUtils: PluginUtils;

  /**
   * Create a new PluginBuilder
   * @param logger Logger instance
   */
  constructor(logger: Logger = new ConsoleLogger()) {
    this.logger = logger;
    this.pluginUtils = new PluginUtils();
  }

  /**
   * Check if a plugin has HTML content (Page.tsx)
   * @param plugin The plugin to check
   * @returns Promise<boolean> True if the plugin has HTML content
   */
  async checkForHtmlContent(plugin: Plugin): Promise<boolean> {
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
   * @param plugin Plugin to build
   * @param distDir Distribution directory
   * @returns Promise<PluginBuildResult | undefined> Build result or undefined if failed
   */
  async buildPlugin(
    plugin: Plugin,
    distDir: string
  ): Promise<PluginBuildResult | undefined> {
    if (!plugin.fullPath) {
      this.logger.info(
        `Skipping plugin with no path: ${plugin.name || 'unknown'}`
      );
      return;
    }

    this.logger.info(`Building plugin: ${plugin.name}`);

    try {
      // Get plugin output info
      const { outputDir, manifestPath } = this.pluginUtils.getPluginOutputInfo(
        plugin,
        distDir
      );

      // Ensure output directory exists
      await fileSystem.ensureDir(outputDir);

      // Read plugin.json
      const jsonPath = path.join(plugin.fullPath, 'plugin.json');
      const pluginJsonData = this.pluginUtils.readPluginJson(jsonPath);

      // If plugin.json is not found, skip this plugin
      if (pluginJsonData === null) {
        this.logger.warn(
          `Plugin ${plugin.name} does not have a plugin.json file, skipping`
        );
        return undefined;
      }

      // Get the files for this plugin
      const pluginFiles = this.pluginUtils.parsePluginFiles(plugin.fullPath);
      plugin.files = plugin.files || [];
      plugin.files.push(...pluginFiles);

      // Check if plugin has HTML content to build webview
      // This should be determined by checking if there's a 'html' directory with a Page.tsx file
      plugin.hasHtml =
        plugin.hasHtml || (await this.checkForHtmlContent(plugin));

      // Build the webview first if the plugin has HTML content
      // This way, we can include the webview assets in the manifest
      if (plugin.hasHtml && plugin.fullPath) {
        try {
          const webviewResult = await webviewBuilder.buildPluginWebview(
            plugin,
            distDir
          );

          if (webviewResult.success) {
            this.logger.info(
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
              this.logger.info(
                `Including webview assets in plugin.json for ${plugin.name}:`
              );
              this.logger.info(`  - Added 'html/**/*' to files array`);
              this.logger.info(`  - Set ui_page to 'html/index.html'`);
            } else {
              this.logger.warn(
                `Webview build for plugin ${plugin.name} succeeded but html directory not found at ${htmlDir}.`
              );
              this.logger.warn(`Not including webview assets in manifest.`);
            }
          } else {
            this.logger.warn(
              `Webview build for plugin ${plugin.name} did not produce expected files.`
            );
            this.logger.warn(`Not including webview assets in manifest.`);
          }
        } catch (error) {
          this.logger.error(
            `Error building webview for plugin ${plugin.name}:`,
            error
          );
          // Continue with the build even if webview fails
        }
      }

      // Get script files based on patterns in plugin.json
      const scriptFiles = scriptProcessor.getPluginScripts(
        pluginJsonData,
        plugin.fullPath
      );

      // Process all files
      const processPromises = plugin.files.map((file) =>
        scriptProcessor.processFile(file, outputDir)
      );
      const processedFiles = await Promise.all(processPromises);

      // Categorize generated files
      const generatedFiles = scriptProcessor.categorizeFiles(processedFiles);

      // Prepare manifest data
      const updatedPluginJson = preparePluginManifestData(
        pluginJsonData,
        generatedFiles,
        scriptFiles
      );

      // Verify the output directory content
      await bundlerService.verifyOutputDir(outputDir);

      return { updatedPluginJson, manifestPath };
    } catch (error) {
      this.logger.error(`Error building plugin ${plugin.name}:`, error);
      return undefined;
    }
  }

  /**
   * Build plugins and generate manifests
   * @param plugins Array of plugins to build
   * @param distDir Distribution directory
   */
  async buildAndGenerateManifests(
    plugins: Plugin[],
    distDir: string
  ): Promise<void> {
    for (const plugin of plugins) {
      const result = await this.buildPlugin(plugin, distDir);
      if (!result) continue;
      const { updatedPluginJson, manifestPath } = result;

      // Generate manifest with the updated plugin JSON data
      generateManifest(updatedPluginJson, manifestPath);
    }
  }

  /**
   * Main build function to build all plugins and resources
   * @returns Promise<{ plugins: Plugin[]; corePlugins: Plugin[] }> Built plugins
   */
  async build(): Promise<{ plugins: Plugin[]; corePlugins: Plugin[] }> {
    const { pluginsDir, coreDir, distDir } = getProjectPaths();

    try {
      await fileSystem.ensureDir(distDir);
      await fileSystem.ensureDir(coreDir);

      const pluginPaths = this.pluginUtils.findPluginPaths(pluginsDir);
      const corePluginPaths = this.pluginUtils.findPluginPaths(coreDir);

      const plugins = this.pluginUtils.parsePluginPaths(pluginPaths);
      const corePlugins = this.pluginUtils.parsePluginPaths(corePluginPaths);

      this.logger.info(
        `Found ${plugins.length} plugins and ${corePlugins.length} core plugins`
      );

      // Build order:
      // 1. Build core plugins first
      this.logger.info('Building core plugins...');
      await this.buildAndGenerateManifests(corePlugins, distDir);

      // 2. Build regular plugins
      this.logger.info('Building regular plugins...');
      await this.buildAndGenerateManifests(plugins, distDir);

      // 3. Generate webview manifest if needed
      const webviewDir = path.join(distDir, 'webview');
      if (fs.existsSync(webviewDir)) {
        this.logger.info('Generating webview manifest...');
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

      this.logger.info('Build completed successfully!');

      // 4. Deploy built resources
      const resourceManager = new ResourceManager(fileSystem, this.logger, {
        reloaderEnabled: process.env.RELOADER_ENABLED === 'true',
        reloaderHost: process.env.RELOADER_HOST || 'localhost',
        reloaderPort: parseInt(process.env.RELOADER_PORT || '3414', 10),
        reloaderApiKey: process.env.RELOADER_API_KEY || 'your-secure-api-key',
      });
      await resourceManager.deployResources(distDir);

      return { plugins, corePlugins };
    } catch (error) {
      this.logger.error('Build failed:', error);
      throw error;
    }
  }
}

// Export a singleton instance for backward compatibility
export const pluginBuilder = new PluginBuilder();

// Export individual functions for backward compatibility
export const checkForHtmlContent =
  pluginBuilder.checkForHtmlContent.bind(pluginBuilder);
export const buildPlugin = pluginBuilder.buildPlugin.bind(pluginBuilder);
export const buildAndGenerateManifests =
  pluginBuilder.buildAndGenerateManifests.bind(pluginBuilder);
export const build = pluginBuilder.build.bind(pluginBuilder);
