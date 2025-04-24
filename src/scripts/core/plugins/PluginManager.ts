/**
 * Plugin manager
 */
import * as path from 'path';
import { Plugin, PluginFile, FileSystem, Logger } from '../types.js';
import { FileSystemImpl } from '../../utils/fs/FileSystemImpl.js';

/**
 * Plugin manager
 */
export class PluginManager {
  private fs: FileSystem;
  private logger: Logger;

  /**
   * Create a new plugin manager
   * @param fs File system
   * @param logger Logger
   */
  constructor(fs: FileSystem = new FileSystemImpl(), logger: Logger) {
    this.fs = fs;
    this.logger = logger;
  }

  /**
   * Get plugin paths
   * @param pluginsDir Plugins directory
   * @returns Plugin paths
   */
  async getPluginPaths(pluginsDir: string): Promise<{ pluginPaths: string[] }> {
    this.logger.debug(`Getting plugin paths from ${pluginsDir}`);

    try {
      // Ensure the plugins directory exists
      await this.fs.ensureDir(pluginsDir);

      // Use Node.js fs module directly for readdir
      const fs = await import('fs');

      // Get all plugin paths recursively
      const allPluginPaths: string[] = [];

      // Helper function to scan directories recursively
      const scanDirectory = async (dir: string, isRoot = false) => {
        // Check if the directory itself has a plugin.json file
        const hasPluginJson = await this.fs.exists(
          path.join(dir, 'plugin.json')
        );

        if (hasPluginJson) {
          // This is a plugin directory
          allPluginPaths.push(dir);
          // Continue scanning subdirectories in case there are nested plugins
        }

        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Check if this directory has a plugin.json file
            const hasPluginJson = await this.fs.exists(
              path.join(fullPath, 'plugin.json')
            );

            if (hasPluginJson) {
              // This is a plugin directory
              allPluginPaths.push(fullPath);
            } else if (isRoot || entry.name.startsWith('[')) {
              // This is a container directory, scan it recursively
              await scanDirectory(fullPath);
            }
          }
        }
      };

      // Start scanning from the plugins directory
      await scanDirectory(pluginsDir, true);

      this.logger.debug(`Found ${allPluginPaths.length} plugin paths`);
      return { pluginPaths: allPluginPaths };
    } catch (error) {
      this.logger.error(`Error getting plugin paths: ${error}`);
      throw error;
    }
  }

  /**
   * Parse plugin paths into plugins
   * @param pluginPaths Plugin paths
   * @returns Plugins
   */
  async parsePluginPaths(pluginPaths: string[]): Promise<Plugin[]> {
    this.logger.debug(`Parsing ${pluginPaths.length} plugin paths`);

    const plugins: Plugin[] = [];

    for (const pluginPath of pluginPaths) {
      try {
        // Get plugin name from path
        const name = path.basename(pluginPath);

        // Check if the plugin has HTML content
        const hasHtml = await this.fs.exists(path.join(pluginPath, 'html'));

        // Calculate the path relative to the plugins directory
        // This is important for nested plugins
        const pluginsDir = pluginPath.includes('src\\plugins')
          ? path.join(process.cwd(), 'src', 'plugins')
          : path.join(process.cwd(), 'src', 'core');

        const pathFromPluginsDir = path.relative(pluginsDir, pluginPath);

        // Create plugin object
        const plugin: Plugin = {
          name,
          pathFromPluginsDir,
          hasHtml,
          fullPath: pluginPath,
          files: [],
        };

        // Get plugin files
        plugin.files = await this.getPluginFiles(pluginPath);

        plugins.push(plugin);
      } catch (error) {
        this.logger.error(`Error parsing plugin path ${pluginPath}: ${error}`);
        // Continue with other plugins
      }
    }

    this.logger.debug(`Parsed ${plugins.length} plugins`);
    return plugins;
  }

  /**
   * Get plugin files
   * @param pluginDir Plugin directory
   * @returns Plugin files
   */
  private async getPluginFiles(pluginDir: string): Promise<PluginFile[]> {
    this.logger.debug(`Getting files for plugin ${path.basename(pluginDir)}`);
    console.log(`Getting files for plugin directory: ${pluginDir}`);

    try {
      // Check if plugin.json exists first
      const pluginJsonPath = path.join(pluginDir, 'plugin.json');
      const pluginJsonExists = await this.fs.exists(pluginJsonPath);

      if (pluginJsonExists) {
        console.log(`Found plugin.json at ${pluginJsonPath}`);
      } else {
        console.log(`plugin.json not found at ${pluginJsonPath}`);
      }

      // Use Node.js fs module directly instead of glob for better handling of special characters
      const fs = await import('fs');
      const pluginFiles: PluginFile[] = [];

      // Helper function to scan directories recursively
      const scanDirectory = async (dir: string, relativePath: string = '') => {
        try {
          const entries = await fs.promises.readdir(dir, {
            withFileTypes: true,
          });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const entryRelativePath = path.join(relativePath, entry.name);

            if (entry.isDirectory()) {
              // Skip node_modules and dist directories
              if (entry.name !== 'node_modules' && entry.name !== 'dist') {
                await scanDirectory(fullPath, entryRelativePath);
              }
            } else {
              // This is a file
              const fileName = entry.name;
              const isPluginJsonFile = fileName === 'plugin.json';

              // Create plugin file object
              const file: PluginFile = {
                name: fileName,
                pathFromPluginDir: entryRelativePath,
                isPluginJsonFile,
                fullPath: fullPath,
              };

              pluginFiles.push(file);
            }
          }
        } catch (error) {
          console.log(`Error scanning directory ${dir}: ${error}`);
        }
      };

      // Start scanning from the plugin directory
      await scanDirectory(pluginDir);

      // Parse files into plugin files
      const pluginJsonFile = pluginFiles.find((file) => file.isPluginJsonFile);
      if (pluginJsonFile) {
        console.log(`Found plugin.json file: ${pluginJsonFile.fullPath}`);
      } else {
        console.log(
          `No plugin.json file found in plugin directory: ${pluginDir}`
        );
      }

      this.logger.debug(
        `Found ${pluginFiles.length} files for plugin ${path.basename(
          pluginDir
        )}`
      );
      return pluginFiles;
    } catch (error) {
      this.logger.error(`Error getting plugin files: ${error}`);
      throw error;
    }
  }

  /**
   * Read plugin JSON
   * @param jsonPath Path to plugin.json
   * @returns Plugin JSON data
   */
  async readPluginJson(jsonPath: string): Promise<any> {
    this.logger.debug(`Reading plugin JSON from ${jsonPath}`);

    try {
      // Check if the file exists first
      if (!(await this.fs.exists(jsonPath))) {
        this.logger.warn(`Plugin.json file not found at path: ${jsonPath}`);
        console.log(`Plugin.json file not found at path: ${jsonPath}`);
        console.log(`Absolute path: ${path.resolve(jsonPath)}`);

        // Try to list the directory contents to see what's there
        try {
          const dirPath = path.dirname(jsonPath);
          console.log(`Directory contents of ${dirPath}:`);
          const fs = await import('fs');
          const files = await fs.promises.readdir(dirPath);
          files.forEach((file) => console.log(`- ${file}`));
        } catch (dirErr) {
          console.log(`Could not read directory: ${dirErr}`);
        }

        return null;
      }

      const content = await this.fs.readFile(jsonPath);
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Error reading plugin JSON: ${error}`);
      console.log(`Error reading plugin.json at ${jsonPath}:`, error);
      console.log(`Absolute path: ${path.resolve(jsonPath)}`);
      throw error;
    }
  }

  /**
   * Get plugin output info
   * @param plugin Plugin
   * @param distDir Distribution directory
   * @returns Plugin output info
   */
  getPluginOutputInfo(
    plugin: Plugin,
    distDir: string
  ): { pluginRelativePath: string; outputDir: string; manifestPath: string } {
    this.logger.debug(`Getting output info for plugin ${plugin.name}`);

    // Calculate relative path
    let pluginRelativePath = plugin.pathFromPluginsDir;

    // Special case for the core plugin
    if (plugin.name === 'core') {
      pluginRelativePath = 'core';
    }

    // Final output directory
    const outputDir = path.join(distDir, pluginRelativePath);

    return {
      pluginRelativePath,
      outputDir,
      manifestPath: path.join(outputDir, 'fxmanifest.lua'),
    };
  }
}
