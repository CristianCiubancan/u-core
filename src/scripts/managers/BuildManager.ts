import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as esbuild from 'esbuild';
import { FileManager } from './FileManager.js';
import { Plugin } from '../types/Plugin.js';
import { File } from '../types/File.js';

/**
 * Build manager
 * This class provides functionality to build plugins by copying files to a dist directory
 */
class BuildManager {
  private fileManager: FileManager;
  private distPath: string;
  private initialized: boolean = false;

  /**
   * Creates a new BuildManager instance
   * @param fileManager The FileManager instance to use for file operations
   * @param distPath Optional path to the distribution directory
   */
  constructor(fileManager: FileManager, distPath: string = 'dist') {
    this.fileManager = fileManager;
    this.distPath = path.resolve(distPath);
  }

  /**
   * Initializes the build manager
   * Must be called before using other methods
   */
  async initialize(): Promise<void> {
    try {
      // Create the dist directory if it doesn't exist
      if (!fsSync.existsSync(this.distPath)) {
        await fs.mkdir(this.distPath, { recursive: true });
      }

      this.initialized = true;
      console.log('BuildManager initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error initializing BuildManager:', error);
      throw new Error(`Failed to initialize BuildManager: ${errorMessage}`);
    }
  }

  /**
   * Builds a plugin by copying all files to the dist directory
   * @param pluginNameOrPath The name or path of the plugin to build
   */
  async buildPlugin(pluginNameOrPath: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Get the plugin
      const plugin = this.getPluginFromNameOrPath(pluginNameOrPath);

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      console.log(`Building plugin: ${plugin.pluginName}`);

      // Create the destination directory
      const destDir = this.getPluginDestDir(plugin);
      await fs.mkdir(destDir, { recursive: true });

      // Build all file types
      await Promise.all([
        this.buildPluginLua(plugin),
        this.buildPluginJson(plugin),
        this.buildPluginTs(plugin),
        this.buildPluginJs(plugin),
        this.buildPluginPageTsx(plugin),
      ]);

      console.log(
        `✓ Plugin ${
          plugin.pluginName
        } built successfully to ${this.pathToDisplay(destDir)}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error building plugin ${pluginNameOrPath}:`, error);
      throw new Error(
        `Failed to build plugin ${pluginNameOrPath}: ${errorMessage}`
      );
    }
  }

  /**
   * Builds Lua files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginLua(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Get all Lua files
      const luaFiles = plugin.files.filter((file) =>
        file.fileName.endsWith('.lua')
      );

      if (luaFiles.length === 0) {
        console.log(`No Lua files found in plugin ${plugin.pluginName}`);
        return;
      }

      await this.copyFilesToDist(plugin, luaFiles);
      console.log(
        `✓ Built ${luaFiles.length} Lua file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building Lua files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build Lua files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building Lua files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build Lua files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Builds JSON files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginJson(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Get all JSON files
      const jsonFiles = plugin.files.filter((file) =>
        file.fileName.endsWith('.json')
      );

      if (jsonFiles.length === 0) {
        console.log(`No JSON files found in plugin ${plugin.pluginName}`);
        return;
      }

      await this.copyFilesToDist(plugin, jsonFiles);
      console.log(
        `✓ Built ${jsonFiles.length} JSON file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building JSON files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build JSON files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building JSON files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build JSON files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Builds TypeScript files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginTs(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Get all TypeScript files (excluding .tsx files which are handled separately)
      const tsFiles = plugin.files.filter(
        (file) =>
          file.fileName.endsWith('.ts') && !file.fileName.endsWith('.tsx')
      );

      if (tsFiles.length === 0) {
        console.log(`No TypeScript files found in plugin ${plugin.pluginName}`);
        return;
      }

      const destDir = this.getPluginDestDir(plugin);

      // Process each TypeScript file
      for (const file of tsFiles) {
        // Get the relative path within the plugin
        const relativePath = path.relative(plugin.fullPath, file.fullPath);

        // Change the extension from .ts to .js for the output file
        const outputRelativePath = relativePath.replace(/\.ts$/, '.js');
        const outputPath = path.join(destDir, outputRelativePath);

        // Create the destination directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // Determine if this is a server-side script
        const isServerScript = this.isServerScript(file.fullPath);
        const externalPackages = this.getExternalPackages(isServerScript);

        // Configure loader based on file type
        const loader: Record<string, esbuild.Loader> = {
          '.ts': 'ts',
          '.js': 'js',
        };

        console.log(`Bundling TypeScript file: ${relativePath}`);

        try {
          // Bundle the file
          const result = await esbuild.build({
            entryPoints: [file.fullPath],
            bundle: true,
            outfile: outputPath,
            format: 'iife', // Use IIFE format for FiveM compatibility
            target: 'es2017',
            minify: false,
            sourcemap: 'external',
            loader,
            logLevel: 'info',
            external: externalPackages,
            // Use node platform for server scripts, browser platform for client scripts
            platform: isServerScript ? 'node' : 'browser',
          });

          // Check for errors
          if (result.errors.length > 0) {
            console.error(`Errors bundling ${file.fullPath}:`, result.errors);
            throw new Error(
              `Failed to bundle ${file.fullPath}: ${result.errors.join(', ')}`
            );
          }

          // Verify the file was created
          if (!fsSync.existsSync(outputPath)) {
            throw new Error(
              `Failed to verify file exists after bundling: ${outputPath}`
            );
          }
        } catch (bundleError) {
          console.error(
            `Error bundling TypeScript file ${file.fullPath}:`,
            bundleError
          );
          throw bundleError;
        }
      }

      console.log(
        `✓ Built ${tsFiles.length} TypeScript file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building TypeScript files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build TypeScript files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building TypeScript files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build TypeScript files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Builds JavaScript files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginJs(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Get all JavaScript files (excluding .jsx files)
      const jsFiles = plugin.files.filter(
        (file) =>
          file.fileName.endsWith('.js') && !file.fileName.endsWith('.jsx')
      );

      if (jsFiles.length === 0) {
        console.log(`No JavaScript files found in plugin ${plugin.pluginName}`);
        return;
      }

      const destDir = this.getPluginDestDir(plugin);

      // Process each JavaScript file
      for (const file of jsFiles) {
        // Get the relative path within the plugin
        const relativePath = path.relative(plugin.fullPath, file.fullPath);
        const outputPath = path.join(destDir, relativePath);

        // Create the destination directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // Determine if this is a server-side script
        const isServerScript = this.isServerScript(file.fullPath);
        const externalPackages = this.getExternalPackages(isServerScript);

        console.log(`Bundling JavaScript file: ${relativePath}`);

        try {
          // Bundle the file
          const result = await esbuild.build({
            entryPoints: [file.fullPath],
            bundle: true,
            outfile: outputPath,
            format: 'iife', // Use IIFE format for FiveM compatibility
            target: 'es2017',
            minify: false,
            sourcemap: 'external',
            external: externalPackages,
            // Use node platform for server scripts, browser platform for client scripts
            platform: isServerScript ? 'node' : 'browser',
          });

          // Check for errors
          if (result.errors.length > 0) {
            console.error(`Errors bundling ${file.fullPath}:`, result.errors);
            throw new Error(
              `Failed to bundle ${file.fullPath}: ${result.errors.join(', ')}`
            );
          }

          // Verify the file was created
          if (!fsSync.existsSync(outputPath)) {
            throw new Error(
              `Failed to verify file exists after bundling: ${outputPath}`
            );
          }
        } catch (bundleError) {
          console.error(
            `Error bundling JavaScript file ${file.fullPath}:`,
            bundleError
          );
          throw bundleError;
        }
      }

      console.log(
        `✓ Built ${jsFiles.length} JavaScript file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building JavaScript files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build JavaScript files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building JavaScript files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build JavaScript files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Builds TSX (TypeScript JSX) page files for a plugin
   * @param pluginNameOrPath The name or path of the plugin, or the Plugin object
   */
  async buildPluginPageTsx(pluginNameOrPath: string | Plugin): Promise<void> {
    this.ensureInitialized();

    try {
      const plugin =
        typeof pluginNameOrPath === 'string'
          ? this.getPluginFromNameOrPath(pluginNameOrPath)
          : pluginNameOrPath;

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Get all TSX files
      const tsxFiles = plugin.files.filter((file) =>
        file.fileName.endsWith('.tsx')
      );

      if (tsxFiles.length === 0) {
        console.log(`No TSX page files found in plugin ${plugin.pluginName}`);
        return;
      }

      await this.copyFilesToDist(plugin, tsxFiles);
      console.log(
        `✓ Built ${tsxFiles.length} TSX page file(s) for plugin ${plugin.pluginName}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (typeof pluginNameOrPath === 'string') {
        console.error(
          `Error building TSX page files for plugin ${pluginNameOrPath}:`,
          error
        );
        throw new Error(
          `Failed to build TSX page files for plugin ${pluginNameOrPath}: ${errorMessage}`
        );
      } else {
        console.error(
          `Error building TSX page files for plugin ${pluginNameOrPath.pluginName}:`,
          error
        );
        throw new Error(
          `Failed to build TSX page files for plugin ${pluginNameOrPath.pluginName}: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Copies files to the dist directory
   * @param plugin The plugin object
   * @param files The files to copy
   * @private
   */
  private async copyFilesToDist(plugin: Plugin, files: File[]): Promise<void> {
    const destDir = this.getPluginDestDir(plugin);

    // Ensure the destination directory exists
    await fs.mkdir(destDir, { recursive: true });

    // Copy each file, preserving directory structure within the plugin
    for (const file of files) {
      // Get the relative path within the plugin
      const relativePath = path.relative(plugin.fullPath, file.fullPath);
      const destPath = path.join(destDir, relativePath);

      // Create the destination directory if it doesn't exist
      const destFileDir = path.dirname(destPath);
      await fs.mkdir(destFileDir, { recursive: true });

      // Copy the file
      await fs.copyFile(file.fullPath, destPath);
    }
  }

  /**
   * Gets the destination directory for a plugin
   * @param plugin The plugin object
   * @private
   */
  private getPluginDestDir(plugin: Plugin): string {
    // Use the plugin's parent folders to build the destination path
    let destPath = this.distPath;

    // If the plugin has parent folders, include them in the path
    if (plugin.parents.length > 0) {
      // We only need the last parent entry which contains the full parent path
      // For example, if parents are ['[misc2]', '[misc2]/[sub-sub-folder]'],
      // we only need the last one which already has the full path structure
      const parentPath = plugin.parents[plugin.parents.length - 1];

      // Combine the parent path with the plugin name
      destPath = path.join(this.distPath, parentPath, plugin.pluginName);
    } else {
      // No parent folders, just place directly under dist
      destPath = path.join(this.distPath, plugin.pluginName);
    }

    return destPath;
  }

  /**
   * Gets a Plugin object from a name or path
   * @param pluginNameOrPath The name or path of the plugin
   * @private
   */
  private getPluginFromNameOrPath(
    pluginNameOrPath: string
  ): Plugin | undefined {
    if (pluginNameOrPath.includes(path.sep)) {
      // It's a path
      return this.fileManager.getPluginByPath(pluginNameOrPath);
    } else {
      // It's a name
      return this.fileManager.getPlugin(pluginNameOrPath);
    }
  }

  /**
   * Converts a path to display format (with forward slashes)
   * @param filePath The path to convert
   * @private
   */
  private pathToDisplay(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Builds all plugins
   */
  async buildAllPlugins(): Promise<void> {
    this.ensureInitialized();

    try {
      const plugins = this.fileManager.getAllPlugins();

      if (plugins.length === 0) {
        console.log('No plugins found to build');
        return;
      }

      console.log(`Building all ${plugins.length} plugins...`);

      for (const plugin of plugins) {
        await this.buildPlugin(plugin.fullPath);
      }

      console.log(`✓ All ${plugins.length} plugins built successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error building all plugins:', error);
      throw new Error(`Failed to build all plugins: ${errorMessage}`);
    }
  }

  /**
   * Cleans the dist directory
   */
  async clean(): Promise<void> {
    this.ensureInitialized();

    try {
      console.log(
        `Cleaning dist directory: ${this.pathToDisplay(this.distPath)}`
      );

      // Check if the directory exists
      if (fsSync.existsSync(this.distPath)) {
        // Remove all files and subdirectories
        await fs.rm(this.distPath, { recursive: true, force: true });

        // Recreate the empty directory
        await fs.mkdir(this.distPath, { recursive: true });
      }

      console.log('✓ Dist directory cleaned successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error cleaning dist directory:', error);
      throw new Error(`Failed to clean dist directory: ${errorMessage}`);
    }
  }

  /**
   * Helper method to ensure the manager is initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'BuildManager must be initialized before use. Call initialize() first.'
      );
    }
  }

  /**
   * Determines if a file is a server-side script based on its path
   * @param filePath Path to check
   * @returns Whether the file is a server-side script
   * @private
   */
  private isServerScript(filePath: string): boolean {
    return filePath.includes('/server/') || filePath.includes('\\server\\');
  }

  /**
   * Gets the list of packages to not inline
   * @param isServerScript Whether the file is a server-side script
   * @returns List of external packages
   * @private
   */
  private getExternalPackages(isServerScript: boolean): string[] {
    // For server scripts, make Node.js modules external
    return isServerScript
      ? [
          'http',
          'https',
          'url',
          'fs',
          'path',
          'os',
          'crypto',
          'buffer',
          'stream',
          'util',
          'events',
          'zlib',
          'net',
          'tls',
          'dns',
          'child_process',
        ]
      : [];
  }
}

export { BuildManager };
