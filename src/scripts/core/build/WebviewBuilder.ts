/**
 * Webview builder
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { FileSystem, Logger, Plugin, WebviewBuilder } from '../types.js';
import { FileSystemImpl } from '../../utils/fs/FileSystemImpl.js';

/**
 * Webview builder implementation
 */
export class WebviewBuilderImpl implements WebviewBuilder {
  private fs: FileSystem;
  private logger: Logger;

  /**
   * Create a new webview builder
   * @param fs File system
   * @param logger Logger
   */
  constructor(fs: FileSystem = new FileSystemImpl(), logger: Logger) {
    this.fs = fs;
    this.logger = logger;
  }

  /**
   * Build webview for all plugins
   * @param plugins Plugins
   * @param distDir Distribution directory
   * @returns Path to the built webview directory
   */
  async buildWebview(plugins: Plugin[], distDir: string): Promise<string> {
    this.logger.info('Building webview UI...');

    try {
      // Validate inputs
      if (!Array.isArray(plugins)) {
        throw new Error('Plugins must be an array');
      }

      if (!distDir) {
        throw new Error('Distribution directory must be provided');
      }

      // Find plugins with webview pages
      const resolvedWebviewPlugins = await Promise.all(
        plugins
          .filter((plugin) => plugin.hasHtml && plugin.fullPath)
          .map(async (plugin) => {
            const pageFile = path.join(plugin.fullPath!, 'html', 'Page.tsx');
            try {
              await fs.access(pageFile);
              return plugin;
            } catch {
              return null;
            }
          })
      );

      // Filter out null values
      const validWebviewPlugins = resolvedWebviewPlugins.filter(
        (plugin): plugin is Plugin => plugin !== null
      );

      this.logger.info(
        `Found ${validWebviewPlugins.length} plugins with webview pages`
      );

      if (validWebviewPlugins.length === 0) {
        this.logger.info(
          'No plugins with webview pages found, skipping webview build'
        );
        return '';
      }

      // Log all plugins with webview pages for debugging
      this.logger.info(
        `Plugins with webview pages: ${JSON.stringify(
          validWebviewPlugins.map((p) => ({
            name: p.name,
            path: p.pathFromPluginsDir,
            fullPath: p.fullPath,
          }))
        )}`
      );

      // Build webview for each plugin
      for (const plugin of validWebviewPlugins) {
        if (!plugin.fullPath) {
          this.logger.warn(
            `Skipping plugin with no fullPath: ${
              plugin.name || plugin.pathFromPluginsDir
            }`
          );
          continue;
        }

        try {
          this.logger.info(
            `Building webview for plugin: ${
              plugin.name || plugin.pathFromPluginsDir
            } (${plugin.fullPath})`
          );
          const htmlDir = await this.buildPluginWebview(plugin, distDir);
          this.logger.info(
            `Webview for plugin ${
              plugin.name || plugin.pathFromPluginsDir
            } built successfully`
          );

          // Update the fxmanifest.lua file to include the webview assets
          await this.updateManifestWithWebviewAssets(plugin, distDir, htmlDir);
        } catch (error) {
          this.logger.error(
            `Error building webview for plugin ${
              plugin.name || plugin.pathFromPluginsDir
            }:`,
            error
          );
          // Continue with other plugins
        }
      }

      // Generate webview manifest
      const webviewDir = path.join(distDir, 'webview');
      if (await this.fs.exists(webviewDir)) {
        this.logger.info('Generating webview manifest...');

        // Create manifest content
        const manifestContent = `
-- Generated webview manifest
fx_version 'cerulean'
game 'gta5'
game 'rdr3'

name 'webview'
version '0.1.0'
author 'Baloony Gaze'
description 'Shared webview assets'

files {
  'index.html',
  'assets/**/*'
}
`;

        // Write manifest file
        await this.fs.writeFile(
          path.join(webviewDir, 'fxmanifest.lua'),
          manifestContent
        );
        this.logger.info('Webview manifest generated successfully');
      }

      return '';
    } catch (error) {
      this.logger.error('Error building webview:', error);
      throw error;
    }
  }

  /**
   * Update the fxmanifest.lua file to include the webview assets
   * @param plugin Plugin
   * @param distDir Distribution directory
   * @param htmlDir Path to the html directory
   */
  async updateManifestWithWebviewAssets(
    plugin: Plugin,
    distDir: string,
    htmlDir: string
  ): Promise<void> {
    try {
      // Get plugin output info
      const pluginRelativePath = plugin.pathFromPluginsDir;
      const resourcePath = path.join(distDir, pluginRelativePath);
      const manifestPath = path.join(resourcePath, 'fxmanifest.lua');

      // Check if the manifest file exists
      if (!(await this.fs.exists(manifestPath))) {
        this.logger.warn(
          `Manifest file not found for plugin ${plugin.name}: ${manifestPath}`
        );
        return;
      }

      // Check if the html directory exists
      if (!(await this.fs.exists(htmlDir))) {
        this.logger.warn(
          `HTML directory not found for plugin ${plugin.name}: ${htmlDir}`
        );
        return;
      }

      // Read the manifest file
      let manifestContent = await this.fs.readFile(manifestPath, 'utf-8');

      // Check if the manifest already includes the webview assets
      if (
        manifestContent.includes('html/**/*') &&
        manifestContent.includes('ui_page')
      ) {
        this.logger.info(
          `Manifest for plugin ${plugin.name} already includes webview assets`
        );
        return;
      }

      // Add the webview assets to the manifest
      let updatedContent = manifestContent;

      // Add the files entry
      if (manifestContent.includes('files {')) {
        // If files section exists, add the html/**/* entry
        if (!manifestContent.includes('html/**/*')) {
          // Check if the files section is empty
          if (manifestContent.match(/files\s*{\s*}/s)) {
            // If the files section is empty, replace it with a section containing html/**/*
            updatedContent = updatedContent.replace(
              /files\s*{\s*}/s,
              `files {\n    'html/**/*',\n}`
            );
          } else {
            // If the files section is not empty, add html/**/* to it
            updatedContent = updatedContent.replace(
              /files\s*{([^}]*)}/s,
              (match, filesContent) => {
                return `files {${filesContent}    'html/**/*',\n}`;
              }
            );
          }
        }
      } else {
        // If files section doesn't exist, add it
        updatedContent += `\nfiles {\n    'html/**/*',\n}\n`;
      }

      // Add the ui_page entry
      if (!manifestContent.includes('ui_page')) {
        updatedContent += `\nui_page 'html/index.html'\n`;
      }

      // Write the updated manifest file
      await this.fs.writeFile(manifestPath, updatedContent);

      this.logger.info(
        `Updated manifest for plugin ${plugin.name} to include webview assets`
      );
    } catch (error) {
      this.logger.error(
        `Error updating manifest for plugin ${plugin.name}:`,
        error
      );
      // Continue with other plugins
    }
  }

  /**
   * Build webview for a single plugin
   * @param plugin Plugin
   * @param distDir Distribution directory
   * @returns Path to the built plugin webview directory
   */
  async buildPluginWebview(plugin: Plugin, distDir: string): Promise<string> {
    this.logger.info(
      `Building webview UI for plugin: ${
        plugin.name || plugin.pathFromPluginsDir || 'unknown'
      }...`
    );

    try {
      if (!plugin.fullPath) {
        throw new Error('Plugin full path is required');
      }

      // Path to the webview directory
      const webviewDir = path.join(process.cwd(), 'src/webview');

      // Get plugin output info
      const pluginRelativePath = plugin.pathFromPluginsDir;
      const resourcePath = path.join(distDir, pluginRelativePath);

      // Create the html directory within the resource where webview files will be placed
      const htmlOutputDir = path.join(resourcePath, 'html');

      // Extract plugin path parts for the build output directory
      const pluginDistPathParts = pluginRelativePath
        ? pluginRelativePath.split('/')
        : [plugin.name];

      // This is where Vite will directly output the build
      const webviewPluginDistDir = path.join(distDir, ...pluginDistPathParts);

      // Verify webview source directory exists
      try {
        await fs.access(webviewDir);
      } catch (error) {
        throw new Error(`Webview directory not found: ${webviewDir}`);
      }

      // Make sure the output directory exists
      await this.fs.ensureDir(webviewPluginDistDir);

      // Check if plugin has a webview page
      if (!plugin.hasHtml || !plugin.fullPath) {
        this.logger.info('Plugin does not have webview pages, skipping build');
        return webviewPluginDistDir;
      }

      const pageFile = path.join(plugin.fullPath, 'html', 'Page.tsx');

      try {
        await fs.access(pageFile);
      } catch {
        this.logger.info(
          'Plugin does not have a Page.tsx file, skipping build'
        );
        return webviewPluginDistDir;
      }

      this.logger.info(`Found webview page for plugin: ${pageFile}`);

      // Set up directories - src directory is where the App.tsx and other files will be generated
      const srcDir = path.join(webviewDir, 'src');
      await this.fs.ensureDir(srcDir);

      // Generate App.tsx content for this single plugin
      let appContent = `// Auto-generated by WebviewBuilder
// Generated on: ${new Date().toISOString()}\n\n`;

      // Calculate relative path from src directory to the Page.tsx file
      const importPath = path.relative(srcDir, pageFile).replace(/\\/g, '/');
      const formattedImportPath = importPath.startsWith('.')
        ? importPath
        : `../../${importPath}`;

      // Add imports to the App.tsx content
      appContent += `import Page from '${formattedImportPath}';\n\n`;

      // Add the App component
      appContent += `function App() {\n`;
      appContent += `  return <Page />;\n`;
      appContent += `}\n\n`;
      appContent += `export default App;\n`;

      // Write the App.tsx file
      const appFilePath = path.join(srcDir, 'App.tsx');
      await this.fs.writeFile(appFilePath, appContent);

      this.logger.info(
        `Generated App.tsx at ${appFilePath} for plugin webview`
      );

      // Get a relative plugin path for logging
      const relPlugin = path.relative(process.cwd(), plugin.fullPath);

      // Run Vite build directly to the plugin's directory
      this.logger.info(`Running Vite build for plugin: ${relPlugin}...`);
      this.logger.info(`Output directory: ${htmlOutputDir}`);

      // Escape the output directory path for the command line
      const escapedOutputDir = htmlOutputDir.replace(/(["\s'$`\\])/g, '\\$1');

      // Build directly to the plugin's html directory
      const buildCommand = `npx vite build --outDir="${escapedOutputDir}"`;

      this.logger.info(`Executing build command: ${buildCommand}`);

      // Use spawn to stream logs without buffering large output
      const child = spawn(buildCommand, {
        cwd: process.cwd(),
        shell: true,
        stdio: 'inherit',
        env: {
          ...process.env,
          PLUGIN_WEBVIEW_ID: relPlugin, // Can be used in vite.config.ts to customize the build
        },
      });

      await new Promise<void>((resolve, reject) => {
        child.on('close', (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`Build command failed with exit code ${code}`))
        );
      });

      this.logger.info(
        `Webview build for plugin ${plugin.name} completed successfully!`
      );

      return htmlOutputDir;
    } catch (error) {
      this.logger.error(
        `Error building webview for plugin ${plugin.name}:`,
        error
      );
      throw error;
    }
  }
}
