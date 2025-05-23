import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { glob } from 'glob'; // For pattern matching in file paths
// Removed ignore import
import { Plugin } from '../types/Plugin.js';
import { File } from '../types/File.js';
import { PluginManifest, BasicPluginManifest } from '../types/Manifest.js';

/**
 * File manager
 * This class will provide the functionality needed to retrieve and act upon files
 */
class FileManager {
  private rootPath: string;
  // Removed projectRoot and gitignore properties
  private plugins: Map<string, Plugin> = new Map();
  private files: Map<string, File> = new Map();

  // Map of full path to plugin for efficient lookups
  private pathToPlugin: Map<string, Plugin> = new Map();

  /**
   * Creates a new FileManager instance
   * @param rootPath Path to the plugins directory
   */
  constructor(rootPath: string = 'src/plugins') {
    this.rootPath = path.resolve(rootPath); // Reverted to original initialization
  }

  /**
   * Initializes the file manager by scanning the plugins directory
   * Must be called before using other methods
   */
  async initialize(): Promise<void> {
    try {
      // Removed loadGitignore call
      await this.scanPlugins();
      console.log(
        `FileManager initialized with ${this.plugins.size} plugins and ${this.files.size} files` // Reverted log message
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error initializing FileManager:', error);
      throw new Error(`Failed to initialize FileManager: ${errorMessage}`);
    }
  }

  // Removed loadGitignore method

  /**
   * Safely escapes special characters in paths for glob patterns
   * @param pathStr The path to escape for glob pattern
   * @returns Safely escaped path for glob pattern
   */
  private escapeGlobPattern(pathStr: string): string {
    // First, normalize using forward slashes for glob patterns
    let normalized = pathStr.replace(/\\/g, '/');

    // Use a more thorough escaping approach - replace each square bracket individually
    // to handle cases with nested square brackets
    let result = '';
    for (let i = 0; i < normalized.length; i++) {
      if (normalized[i] === '[') {
        result += '[[]';
      } else if (normalized[i] === ']') {
        result += '[]]';
      } else {
        result += normalized[i];
      }
    }

    console.log(`Original path: ${pathStr}`);
    console.log(`Escaped path: ${result}`);

    return result;
  }

  /**
   * Scans the plugins directory to discover all plugins
   */
  private async scanPlugins(): Promise<void> {
    try {
      // Use glob to find all plugin.json files
      const pluginJsonRawPattern = path.join(
        this.rootPath,
        '**',
        'plugin.json'
      );
      const pluginJsonPattern = this.escapeGlobPattern(pluginJsonRawPattern);

      const options = {
        windowsPathsNoEscape: true, // Important for paths with square brackets
        nodir: true,
      };

      const pluginJsonPaths = await glob(pluginJsonPattern, options);

      if (pluginJsonPaths.length === 0) {
        console.warn(
          `No plugins found in ${this.pathToDisplay(this.rootPath)}`
        );
      }

      for (const pluginJsonPath of pluginJsonPaths) {
        try {
          const pluginDir = path.dirname(pluginJsonPath);
          const plugin = await this.registerPlugin(pluginDir);

          // Try to load the manifest for this plugin
          try {
            const manifest = await this.loadPluginManifest(pluginJsonPath);
            plugin.manifest = manifest;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.warn(
              `Warning: Failed to load manifest for plugin ${plugin.pluginName}: ${errorMessage}`
            );
          }

          await this.scanPluginFiles(plugin);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `Error registering plugin at ${this.pathToDisplay(
              pluginJsonPath
            )}:`,
            errorMessage
          );
          // Continue with other plugins even if one fails
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error scanning plugins:', error);
      throw new Error(`Failed to scan plugins: ${errorMessage}`);
    }
  }

  /**
   * Loads and parses a plugin manifest file
   * @param manifestPath Path to the plugin.json file
   */
  private async loadPluginManifest(
    manifestPath: string
  ): Promise<PluginManifest> {
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      try {
        return JSON.parse(manifestContent) as PluginManifest;
      } catch (parseError) {
        console.warn(
          `Warning: Invalid JSON in plugin manifest at ${this.pathToDisplay(
            manifestPath
          )}`
        );
        // Return a basic manifest with just the plugin name derived from the directory
        const pluginDir = path.dirname(manifestPath);
        const pluginName = path.basename(pluginDir);
        return { name: pluginName } as BasicPluginManifest;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read plugin manifest: ${errorMessage}`);
    }
  }

  /**
   * Registers a plugin based on its directory
   */
  private async registerPlugin(pluginDir: string): Promise<Plugin> {
    // Generate a unique plugin ID that includes its path hierarchy
    const relativePath = path.relative(this.rootPath, pluginDir);
    const pluginPathParts = relativePath.split(path.sep);
    const pluginName = pluginPathParts[pluginPathParts.length - 1];

    // Extract and build parent paths using forward slashes
    const parents: string[] = [];
    if (pluginPathParts.length > 1) {
      // Create an array of all parent paths
      for (let i = 0; i < pluginPathParts.length - 1; i++) {
        // Build path up to this parent level with forward slashes
        const parentPath = pluginPathParts.slice(0, i + 1).join('/');
        parents.push(parentPath);
      }
    }

    // Create a path-based identifier for the plugin
    const pluginPathIdentifier =
      this.generatePluginPathIdentifier(relativePath);

    // Check for duplicate plugin paths
    if (this.plugins.has(pluginPathIdentifier)) {
      throw new Error(
        `Duplicate plugin detected at path: ${this.pathToDisplay(relativePath)}`
      );
    }

    const plugin: Plugin = {
      pluginName,
      fullPath: pluginDir,
      displayPath: this.pathToDisplay(pluginDir),
      files: [],
      parents,
    };

    this.plugins.set(pluginPathIdentifier, plugin);
    this.pathToPlugin.set(pluginDir, plugin);

    return plugin;
  }

  /**
   * Generates a unique path identifier for a plugin based on its relative path
   */
  private generatePluginPathIdentifier(relativePath: string): string {
    // Replace backslashes with forward slashes for consistent handling
    const normalizedPath = relativePath.replace(/\\/g, '/');
    return normalizedPath;
  }

  /**
   * Scans all files in a plugin
   */
  private async scanPluginFiles(
    plugin: Plugin,
    currentDir = plugin.fullPath
  ): Promise<void> {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Manually ignore node_modules directories
        if (entry.isDirectory() && entry.name === 'node_modules') {
          // console.log(`Ignoring node_modules directory: ${fullPath}`); // Optional debug log
          continue; // Skip this directory
        }

        // Removed gitignore check

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await this.scanPluginFiles(plugin, fullPath);
        } else if (entry.isFile()) {
          // Register the file
          const file: File = {
            fileName: entry.name,
            fullPath: fullPath,
            displayPath: this.pathToDisplay(fullPath),
            plugin,
          };

          this.files.set(fullPath, file);
          plugin.files.push(file);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentDir}:`, error);
    }
  }

  /**
   * Converts a path to use forward slashes for display
   * @param filePath The path to convert
   */
  pathToDisplay(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Gets a plugin by name and optional parent path
   * @param pluginName The name of the plugin
   * @param parentPath Optional parent path to distinguish between plugins with the same name
   */
  getPlugin(pluginName: string, parentPath?: string): Plugin | undefined {
    if (parentPath) {
      // Get by full path
      const fullPath = path.join(this.rootPath, parentPath, pluginName);
      return this.pathToPlugin.get(this.normalizePath(fullPath));
    } else {
      // Try to find by name only - this might return the first match if there are duplicates
      for (const plugin of this.plugins.values()) {
        if (plugin.pluginName === pluginName) {
          return plugin;
        }
      }
      return undefined;
    }
  }

  /**
   * Gets a plugin by full path
   * @param pluginPath The full path to the plugin
   */
  getPluginByPath(pluginPath: string): Plugin | undefined {
    const normalizedPath = this.normalizePath(pluginPath);
    return this.pathToPlugin.get(normalizedPath);
  }

  /**
   * Gets all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Gets plugins with a specific name (potentially multiple in different parent folders)
   * @param pluginName The name of the plugin
   */
  getPluginsByName(pluginName: string): Plugin[] {
    return Array.from(this.plugins.values()).filter(
      (plugin) => plugin.pluginName === pluginName
    );
  }

  /**
   * Gets plugins in a specific parent folder
   * @param parentFolder The parent folder path relative to the root
   */
  getPluginsInFolder(parentFolder: string): Plugin[] {
    const fullParentPath = path.join(this.rootPath, parentFolder);
    const normalizedParentPath = this.normalizePath(fullParentPath);

    return Array.from(this.plugins.values()).filter((plugin) =>
      this.normalizePath(plugin.fullPath).startsWith(normalizedParentPath)
    );
  }

  /**
   * Gets a file by path
   * @param filePath The path to the file
   */
  getFile(filePath: string): File | undefined {
    return this.files.get(this.normalizePath(filePath));
  }

  /**
   * Gets all files for a plugin
   * @param pluginNameOrPath The name or path of the plugin
   */
  getFilesForPlugin(pluginNameOrPath: string): File[] {
    // Check if it's a full path
    if (pluginNameOrPath.includes(path.sep)) {
      const plugin = this.getPluginByPath(pluginNameOrPath);
      return plugin?.files || [];
    } else {
      // It's just a name, might return multiple plugins
      const plugins = this.getPluginsByName(pluginNameOrPath);
      if (plugins.length === 0) return [];
      if (plugins.length === 1) return plugins[0].files || [];

      // Multiple plugins with the same name, return all files
      return plugins.flatMap((plugin) => plugin.files || []);
    }
  }

  /**
   * Gets all files matching a pattern (glob) for a plugin
   * @param pluginNameOrPath The name or path of the plugin
   * @param pattern The glob pattern to match against files
   */
  async getFilesMatchingPattern(
    pluginNameOrPath: string,
    pattern: string
  ): Promise<File[]> {
    const plugins = pluginNameOrPath.includes(path.sep)
      ? ([this.getPluginByPath(pluginNameOrPath)].filter(Boolean) as Plugin[])
      : this.getPluginsByName(pluginNameOrPath);

    if (plugins.length === 0) return [];

    const results: File[] = [];

    for (const plugin of plugins) {
      // Make sure we escape square brackets in both the plugin path and pattern
      const fileRawPattern = path.join(plugin.fullPath, pattern);
      const filePattern = this.escapeGlobPattern(fileRawPattern);

      const options = { windowsPathsNoEscape: true };

      const matchingPaths = await glob(filePattern, options);

      for (const filePath of matchingPaths) {
        const file = this.files.get(filePath);
        if (file) results.push(file);
      }
    }

    return results;
  }

  /**
   * Gets all files matching an extension for a plugin
   * @param pluginNameOrPath The name or path of the plugin
   * @param extension The file extension to match (with or without leading dot)
   */
  getFilesByExtension(pluginNameOrPath: string, extension: string): File[] {
    // Ensure extension starts with a dot
    if (!extension.startsWith('.')) {
      extension = `.${extension}`;
    }

    const files = this.getFilesForPlugin(pluginNameOrPath);
    return files.filter((file) => path.extname(file.fileName) === extension);
  }

  /**
   * Gets the manifest file for a plugin
   * @param pluginNameOrPath The name or path of the plugin
   */
  async getPluginManifest(
    pluginNameOrPath: string
  ): Promise<PluginManifest | undefined> {
    let plugin: Plugin | undefined;

    // Check if it's a full path
    if (pluginNameOrPath.includes(path.sep)) {
      plugin = this.getPluginByPath(pluginNameOrPath);
    } else {
      // It's just a name
      plugin = this.getPlugin(pluginNameOrPath);
    }

    if (!plugin) return undefined;

    // Check if we already have the manifest in the plugin object
    if (plugin.manifest) return plugin.manifest;

    // Otherwise, try to load it
    try {
      const manifestPath = path.join(plugin.fullPath, 'plugin.json');
      const manifest = await this.loadPluginManifest(manifestPath);
      plugin.manifest = manifest; // Cache for future use
      return manifest;
    } catch (error) {
      console.warn(
        `Warning: Could not load manifest for plugin ${plugin.pluginName}`
      );
      return undefined;
    }
  }

  /**
   * Reads the content of a file
   * @param filePath The path to the file
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const file = this.files.get(normalizedPath);

      if (!file) {
        throw new Error(`File not found: ${this.pathToDisplay(filePath)}`);
      }

      return await fs.readFile(normalizedPath, 'utf-8');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error reading file ${this.pathToDisplay(filePath)}:`,
        error
      );
      throw new Error(
        `Failed to read file ${this.pathToDisplay(filePath)}: ${errorMessage}`
      );
    }
  }

  /**
   * Writes content to a file
   * @param filePath The path to the file
   * @param content The content to write
   */
  async writeFile(filePath: string, content: string): Promise<File> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      let file = this.files.get(normalizedPath);

      if (!file) {
        // If the file doesn't exist, we need to determine which plugin it belongs to
        const plugin = this.findPluginForPath(normalizedPath);
        if (!plugin) {
          throw new Error(
            `Cannot determine plugin for path: ${this.pathToDisplay(filePath)}`
          );
        }

        // Create the directory if it doesn't exist
        const dir = path.dirname(normalizedPath);
        await fs.mkdir(dir, { recursive: true });

        // Create the file
        await fs.writeFile(normalizedPath, content, 'utf-8');

        // Register the new file
        file = {
          fileName: path.basename(normalizedPath),
          fullPath: normalizedPath,
          displayPath: this.pathToDisplay(normalizedPath),
          plugin,
        };

        this.files.set(normalizedPath, file);
        plugin.files.push(file);

        // If this is a plugin.json file, update the manifest in the plugin
        if (path.basename(normalizedPath) === 'plugin.json') {
          try {
            plugin.manifest = JSON.parse(content) as PluginManifest;
          } catch (error) {
            console.warn(
              `Warning: Invalid JSON in new plugin.json for plugin ${plugin.pluginName}`
            );
          }
        }
      } else {
        // If the file exists, just update its content
        await fs.writeFile(normalizedPath, content, 'utf-8');

        // If this is a plugin.json file, update the manifest in the plugin
        if (path.basename(normalizedPath) === 'plugin.json') {
          try {
            file.plugin.manifest = JSON.parse(content) as PluginManifest;
          } catch (error) {
            console.warn(
              `Warning: Invalid JSON in updated plugin.json for plugin ${file.plugin.pluginName}`
            );
          }
        }
      }

      return file;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error writing file ${this.pathToDisplay(filePath)}:`,
        error
      );
      throw new Error(
        `Failed to write file ${this.pathToDisplay(filePath)}: ${errorMessage}`
      );
    }
  }

  /**
   * Deletes a file
   * @param filePath The path to the file
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const file = this.files.get(normalizedPath);

      if (!file) {
        return false; // File not found
      }

      // Check if this is a plugin.json file - don't allow deletion if it is
      if (path.basename(normalizedPath) === 'plugin.json') {
        throw new Error(
          `Cannot delete plugin.json file. To remove a plugin, use removePlugin() instead.`
        );
      }

      // Remove the file from the file system
      await fs.unlink(normalizedPath);

      // Remove the file from the plugin
      const plugin = file.plugin;
      const pluginFiles = plugin.files || [];
      plugin.files = pluginFiles.filter((f) => f.fullPath !== normalizedPath);

      // Remove the file from the registry
      this.files.delete(normalizedPath);

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error deleting file ${this.pathToDisplay(filePath)}:`,
        error
      );
      throw new Error(
        `Failed to delete file ${this.pathToDisplay(filePath)}: ${errorMessage}`
      );
    }
  }

  /**
   * Copies a file to a new location
   * @param sourceFilePath The path to the source file
   * @param destinationFilePath The path to the destination file
   */
  async copyFile(
    sourceFilePath: string,
    destinationFilePath: string
  ): Promise<File> {
    try {
      const sourceNormalizedPath = this.normalizePath(sourceFilePath);
      const destNormalizedPath = this.normalizePath(destinationFilePath);

      const sourceFile = this.files.get(sourceNormalizedPath);
      if (!sourceFile) {
        throw new Error(
          `Source file not found: ${this.pathToDisplay(sourceFilePath)}`
        );
      }

      // Check if this is a plugin.json file - don't allow copying if it is
      if (path.basename(sourceNormalizedPath) === 'plugin.json') {
        throw new Error(
          `Cannot copy plugin.json file directly. Use createPlugin() instead.`
        );
      }

      // Determine the destination plugin
      const destPlugin = this.findPluginForPath(destNormalizedPath);
      if (!destPlugin) {
        throw new Error(
          `Cannot determine plugin for destination path: ${this.pathToDisplay(
            destinationFilePath
          )}`
        );
      }

      // Create the directory if it doesn't exist
      const destDir = path.dirname(destNormalizedPath);
      await fs.mkdir(destDir, { recursive: true });

      // Copy the file
      await fs.copyFile(sourceNormalizedPath, destNormalizedPath);

      // Register the new file
      const destFile: File = {
        fileName: path.basename(destNormalizedPath),
        fullPath: destNormalizedPath,
        displayPath: this.pathToDisplay(destNormalizedPath),
        plugin: destPlugin,
      };

      this.files.set(destNormalizedPath, destFile);
      destPlugin.files.push(destFile);

      return destFile;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error copying file ${this.pathToDisplay(
          sourceFilePath
        )} to ${this.pathToDisplay(destinationFilePath)}:`,
        error
      );
      throw new Error(`Failed to copy file: ${errorMessage}`);
    }
  }

  /**
   * Creates a new plugin
   * @param pluginName The name of the plugin
   * @param parentFolder Optional parent folder path (relative to root)
   * @param manifest Optional manifest data for the plugin
   */
  async createPlugin(
    pluginName: string,
    parentFolder?: string,
    manifest?: PluginManifest
  ): Promise<Plugin> {
    try {
      // Determine the full path to the new plugin
      let pluginPath: string;
      if (parentFolder) {
        // Make sure parent folder exists
        const parentPath = path.join(this.rootPath, parentFolder);

        if (!fsSync.existsSync(parentPath)) {
          await fs.mkdir(parentPath, { recursive: true });
        }

        pluginPath = path.join(parentPath, pluginName);
      } else {
        pluginPath = path.join(this.rootPath, pluginName);
      }

      // Check if the plugin already exists at this path
      if (fsSync.existsSync(path.join(pluginPath, 'plugin.json'))) {
        throw new Error(
          `Plugin already exists at path: ${this.pathToDisplay(pluginPath)}`
        );
      }

      // Create the plugin directory
      await fs.mkdir(pluginPath, { recursive: true });

      // Create standard directories
      await Promise.all([
        fs.mkdir(path.join(pluginPath, 'client'), { recursive: true }),
        fs.mkdir(path.join(pluginPath, 'server'), { recursive: true }),
        fs.mkdir(path.join(pluginPath, 'html'), { recursive: true }),
        fs.mkdir(path.join(pluginPath, 'translations'), { recursive: true }),
      ]);

      // Create the plugin.json file with provided manifest or a default one
      const pluginManifest: PluginManifest = manifest || {
        name: pluginName,
        version: '1.0.0',
        description: `${pluginName} plugin`,
      };

      await fs.writeFile(
        path.join(pluginPath, 'plugin.json'),
        JSON.stringify(pluginManifest, null, 2),
        'utf-8'
      );

      // Register the new plugin
      const plugin = await this.registerPlugin(pluginPath);
      plugin.manifest = pluginManifest; // Set the manifest
      await this.scanPluginFiles(plugin);

      return plugin;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error creating plugin ${pluginName}:`, error);
      throw new Error(`Failed to create plugin ${pluginName}: ${errorMessage}`);
    }
  }

  /**
   * Removes a plugin
   * @param pluginNameOrPath The name or path of the plugin
   */
  async removePlugin(pluginNameOrPath: string): Promise<void> {
    try {
      let plugin: Plugin | undefined;

      // Check if it's a path or a name
      if (pluginNameOrPath.includes(path.sep)) {
        plugin = this.getPluginByPath(pluginNameOrPath);
      } else {
        const plugins = this.getPluginsByName(pluginNameOrPath);

        if (plugins.length === 0) {
          throw new Error(`Plugin not found: ${pluginNameOrPath}`);
        }

        if (plugins.length > 1) {
          throw new Error(
            `Multiple plugins found with name: ${pluginNameOrPath}. Please specify the full path.`
          );
        }

        plugin = plugins[0];
      }

      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }

      // Remove all files from the registry
      const pluginFiles = plugin.files || [];
      for (const file of pluginFiles) {
        this.files.delete(file.fullPath);
      }

      // Remove the plugin from the registries
      const pathIdentifier = this.generatePluginPathIdentifier(
        path.relative(this.rootPath, plugin.fullPath)
      );

      this.plugins.delete(pathIdentifier);
      this.pathToPlugin.delete(plugin.fullPath);

      // Remove the plugin directory
      await fs.rm(plugin.fullPath, { recursive: true, force: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error removing plugin ${pluginNameOrPath}:`, error);
      throw new Error(
        `Failed to remove plugin ${pluginNameOrPath}: ${errorMessage}`
      );
    }
  }

  /**
   * Normalizes a path for consistent handling
   * @param filePath The path to normalize
   */
  private normalizePath(filePath: string): string {
    // Resolve to absolute path if it's relative
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(this.rootPath, filePath);
    }

    // Normalize path separators
    return path.normalize(filePath);
  }

  /**
   * Finds the plugin for a given path
   * @param filePath The path to find the plugin for
   */
  private findPluginForPath(filePath: string): Plugin | undefined {
    // Convert to absolute path if it's not already
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.rootPath, filePath);

    // Find the plugin with the longest matching path prefix
    let bestMatch: Plugin | undefined;
    let bestMatchLength = 0;

    for (const plugin of this.plugins.values()) {
      if (
        absolutePath.startsWith(plugin.fullPath) &&
        plugin.fullPath.length > bestMatchLength
      ) {
        bestMatch = plugin;
        bestMatchLength = plugin.fullPath.length;
      }
    }

    return bestMatch;
  }

  /**
   * Gets all the unique parent folders of plugins
   */
  getParentFolders(): string[] {
    const parentFolders = new Set<string>();

    for (const plugin of this.plugins.values()) {
      const relativePath = path.relative(this.rootPath, plugin.fullPath);
      const parts = relativePath.split(path.sep);

      if (parts.length > 1) {
        // If there are parent folders
        const parentFolder = parts.slice(0, -1).join('/'); // Use forward slash here
        parentFolders.add(parentFolder);
      }
    }

    return Array.from(parentFolders);
  }

  /**
   * Refreshes the file system scan
   */
  async refresh(): Promise<void> {
    // Clear existing data
    this.plugins.clear();
    this.files.clear();
    this.pathToPlugin.clear();

    // Scan again
    await this.scanPlugins();
  }

  /**
   * Reloads a specific plugin by re-reading its files from the file system.
   * @param pluginPath The full path to the plugin directory.
   * @throws {Error} If the plugin is not found or if there is an error during reloading.
   */
  async reloadPlugin(pluginPath: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(pluginPath);
      const plugin = this.pathToPlugin.get(normalizedPath);
      if (!plugin) {
        throw new Error(
          `Plugin not found at path: ${this.pathToDisplay(pluginPath)}`
        );
      }

      // Remove existing files associated with the plugin
      for (const file of plugin.files) {
        this.files.delete(file.fullPath);
      }

      // Remove the plugin from registries
      const pathIdentifier = this.generatePluginPathIdentifier(
        path.relative(this.rootPath, plugin.fullPath)
      );
      this.plugins.delete(pathIdentifier);
      this.pathToPlugin.delete(normalizedPath);

      // Re-register the plugin
      const reloadedPlugin = await this.registerPlugin(normalizedPath);

      // Reload the manifest
      const manifestPath = path.join(normalizedPath, 'plugin.json');
      try {
        reloadedPlugin.manifest = await this.loadPluginManifest(manifestPath);
      } catch (error) {
        console.warn(
          `Warning: Failed to load manifest for plugin at ${this.pathToDisplay(
            manifestPath
          )}: ${error}`
        );
      }

      // Re-scan the plugin files
      await this.scanPluginFiles(reloadedPlugin);

      console.log(`Plugin reloaded successfully: ${reloadedPlugin.pluginName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error reloading plugin at ${this.pathToDisplay(pluginPath)}:`,
        error
      );
      throw new Error(`Failed to reload plugin: ${errorMessage}`);
    }
  }
}

export { FileManager };
