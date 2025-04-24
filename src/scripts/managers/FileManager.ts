import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import glob from 'glob-promise'; // For pattern matching in file paths

/**
 * File manager
 * This class will provide the functionality needed to retrieve and act upon files
 */
class FileManager {
  private rootPath: string;
  private plugins: Map<string, Plugin> = new Map();
  private files: Map<string, File> = new Map();

  // Map of full path to plugin for efficient lookups
  private pathToPlugin: Map<string, Plugin> = new Map();

  /**
   * Creates a new FileManager instance
   * @param rootPath Path to the plugins directory
   */
  constructor(rootPath: string = 'src/plugins') {
    this.rootPath = path.resolve(rootPath);
  }

  /**
   * Initializes the file manager by scanning the plugins directory
   * Must be called before using other methods
   */
  async initialize(): Promise<void> {
    try {
      await this.scanPlugins();
      console.log(
        `FileManager initialized with ${this.plugins.size} plugins and ${this.files.size} files`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error initializing FileManager:', error);
      throw new Error(`Failed to initialize FileManager: ${errorMessage}`);
    }
  }

  /**
   * Scans the plugins directory to discover all plugins
   */
  private async scanPlugins(): Promise<void> {
    try {
      // Use glob to find all plugin.json files
      // Note: Using forward slashes for glob patterns to ensure cross-platform compatibility
      const pluginJsonPattern = path
        .join(this.rootPath, '**', 'plugin.json')
        .replace(/\\/g, '/');
      const options = {
        windowsPathsNoEscape: true, // Important for paths with square brackets
        nodir: true,
      };

      const pluginJsonPaths = await glob(pluginJsonPattern, options);

      if (pluginJsonPaths.length === 0) {
        console.warn(`No plugins found in ${this.rootPath}`);
      }

      for (const pluginJsonPath of pluginJsonPaths) {
        try {
          const pluginDir = path.dirname(pluginJsonPath);
          const plugin = await this.registerPlugin(pluginDir);
          await this.scanPluginFiles(plugin);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `Error registering plugin at ${pluginJsonPath}:`,
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
   * Registers a plugin based on its directory
   */
  private async registerPlugin(pluginDir: string): Promise<Plugin> {
    // Generate a unique plugin ID that includes its path hierarchy
    const relativePath = path.relative(this.rootPath, pluginDir);
    const pluginPathParts = relativePath.split(path.sep);
    const pluginName = pluginPathParts[pluginPathParts.length - 1];

    // Create a path-based identifier for the plugin
    const pluginPathIdentifier =
      this.generatePluginPathIdentifier(relativePath);

    // Check for duplicate plugin paths
    if (this.plugins.has(pluginPathIdentifier)) {
      throw new Error(`Duplicate plugin detected at path: ${relativePath}`);
    }

    // Parse plugin.json to get additional info if needed
    const pluginJsonPath = path.join(pluginDir, 'plugin.json');
    let pluginJsonContent = {};

    try {
      const jsonData = await fs.readFile(pluginJsonPath, 'utf-8');
      pluginJsonContent = JSON.parse(jsonData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Warning: Could not parse plugin.json for ${pluginName}: ${errorMessage}`
      );
    }

    const plugin: Plugin = {
      pluginName,
      fullPath: pluginDir,
      files: [],
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
  private async scanPluginFiles(plugin: Plugin): Promise<void> {
    try {
      // Use glob to find all files in the plugin directory
      // Handle special characters in path, including square brackets
      const filePattern = path
        .join(plugin.fullPath, '**', '*')
        .replace(/\\/g, '/');
      const options = {
        windowsPathsNoEscape: true,
        nodir: true,
      };

      const filePaths = await glob(filePattern, options);

      for (const filePath of filePaths) {
        // Skip the plugin.json file since we already processed it
        if (path.basename(filePath) === 'plugin.json') continue;

        const file: File = {
          fileName: path.basename(filePath),
          fullPath: filePath,
          plugin,
        };

        this.files.set(filePath, file);
        plugin.files.push(file);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error scanning files for plugin ${plugin.pluginName}:`,
        error
      );
      throw new Error(
        `Failed to scan files for plugin ${plugin.pluginName}: ${errorMessage}`
      );
    }
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
      const filePattern = path
        .join(plugin.fullPath, pattern)
        .replace(/\\/g, '/');
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
   * Reads the content of a file
   * @param filePath The path to the file
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const file = this.files.get(normalizedPath);

      if (!file) {
        throw new Error(`File not found: ${filePath}`);
      }

      return await fs.readFile(normalizedPath, 'utf-8');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error reading file ${filePath}:`, error);
      throw new Error(`Failed to read file ${filePath}: ${errorMessage}`);
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
          throw new Error(`Cannot determine plugin for path: ${filePath}`);
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
          plugin,
        };

        this.files.set(normalizedPath, file);
        plugin.files.push(file);
      } else {
        // If the file exists, just update its content
        await fs.writeFile(normalizedPath, content, 'utf-8');
      }

      return file;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error writing file ${filePath}:`, error);
      throw new Error(`Failed to write file ${filePath}: ${errorMessage}`);
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
      console.error(`Error deleting file ${filePath}:`, error);
      throw new Error(`Failed to delete file ${filePath}: ${errorMessage}`);
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
        throw new Error(`Source file not found: ${sourceFilePath}`);
      }

      // Determine the destination plugin
      const destPlugin = this.findPluginForPath(destNormalizedPath);
      if (!destPlugin) {
        throw new Error(
          `Cannot determine plugin for destination path: ${destinationFilePath}`
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
        plugin: destPlugin,
      };

      this.files.set(destNormalizedPath, destFile);
      destPlugin.files.push(destFile);

      return destFile;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error copying file ${sourceFilePath} to ${destinationFilePath}:`,
        error
      );
      throw new Error(`Failed to copy file: ${errorMessage}`);
    }
  }

  /**
   * Creates a new plugin
   * @param pluginName The name of the plugin
   * @param parentFolder Optional parent folder path (relative to root)
   */
  async createPlugin(
    pluginName: string,
    parentFolder?: string
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
        throw new Error(`Plugin already exists at path: ${pluginPath}`);
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

      // Create the plugin.json file
      await fs.writeFile(
        path.join(pluginPath, 'plugin.json'),
        JSON.stringify({ name: pluginName }, null, 2),
        'utf-8'
      );

      // Register the new plugin
      const plugin = await this.registerPlugin(pluginPath);
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
        const parentFolder = parts.slice(0, -1).join(path.sep);
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
}

// Define interfaces
interface Plugin {
  pluginName: string;
  fullPath: string;
  files: File[];
}

interface File {
  fileName: string;
  fullPath: string;
  plugin: Plugin;
}

export { FileManager, Plugin, File };
