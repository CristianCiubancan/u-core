import { FileManager } from './FileManager.js';
import { Plugin } from '../types/Plugin.js';
import { File } from '../types/File.js';

/**
 * Plugin manager
 * This class provides functionality to load and retrieve plugins
 */
class PluginManager {
  private fileManager: FileManager;
  private initialized: boolean = false;

  /**
   * Creates a new PluginManager instance
   * @param fileManager Optional FileManager instance. If not provided, a new one will be created.
   * @param pluginsPath Optional path to the plugins directory. Used only if fileManager is not provided.
   */
  constructor(fileManager?: FileManager, pluginsPath: string = 'src/plugins') {
    this.fileManager = fileManager || new FileManager(pluginsPath);
  }

  /**
   * Initializes the plugin manager by loading all plugins
   * Must be called before using other methods
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.fileManager.initialize();
      this.initialized = true;
      console.log(
        `PluginManager initialized with ${this.getAllPlugins().length} plugins`
      );
    }
  }

  /**
   * Gets all loaded plugins
   */
  getAllPlugins(): Plugin[] {
    this.ensureInitialized();
    return this.fileManager.getAllPlugins();
  }

  /**
   * Gets a plugin by name and optional parent path
   * @param pluginName The name of the plugin
   * @param parentPath Optional parent path to distinguish between plugins with the same name
   */
  getPlugin(pluginName: string, parentPath?: string): Plugin | undefined {
    this.ensureInitialized();
    return this.fileManager.getPlugin(pluginName, parentPath);
  }

  /**
   * Gets a plugin by full path
   * @param pluginPath The full path to the plugin
   */
  getPluginByPath(pluginPath: string): Plugin | undefined {
    this.ensureInitialized();
    return this.fileManager.getPluginByPath(pluginPath);
  }

  /**
   * Gets plugins with a specific name (potentially multiple in different parent folders)
   * @param pluginName The name of the plugin
   */
  getPluginsByName(pluginName: string): Plugin[] {
    this.ensureInitialized();
    return this.fileManager.getPluginsByName(pluginName);
  }

  /**
   * Gets plugins in a specific parent folder
   * @param parentFolder The parent folder path relative to the root
   */
  getPluginsInFolder(parentFolder: string): Plugin[] {
    this.ensureInitialized();
    return this.fileManager.getPluginsInFolder(parentFolder);
  }

  /**
   * Gets all the unique parent folders of plugins
   */
  getParentFolders(): string[] {
    this.ensureInitialized();
    return this.fileManager.getParentFolders();
  }

  /**
   * Gets files of a plugin by file extension
   * @param pluginNameOrPath The name or path of the plugin
   * @param extension The file extension to filter by (with or without leading dot)
   */
  getPluginFilesByExtension(
    pluginNameOrPath: string,
    extension: string
  ): File[] {
    this.ensureInitialized();
    return this.fileManager.getFilesByExtension(pluginNameOrPath, extension);
  }

  /**
   * Gets files of a plugin matching a pattern
   * @param pluginNameOrPath The name or path of the plugin
   * @param pattern The glob pattern to match files against
   */
  async getPluginFilesByPattern(
    pluginNameOrPath: string,
    pattern: string
  ): Promise<File[]> {
    this.ensureInitialized();
    return this.fileManager.getFilesMatchingPattern(pluginNameOrPath, pattern);
  }

  /**
   * Gets the FileManager instance
   */
  getFileManager(): FileManager {
    return this.fileManager;
  }

  /**
   * Helper method to ensure the manager is initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'PluginManager must be initialized before use. Call initialize() first.'
      );
    }
  }

  /**
   * Reloads a specific plugin by re-reading its files from the file system.
   * @param pluginNameOrPath The name or path of the plugin to reload.
   * @throws {Error} If the plugin is not found or if multiple plugins with the same name are found.
   */
  async reloadPlugin(pluginNameOrPath: string): Promise<void> {
    this.ensureInitialized();
    // Try to get the plugin by path first
    let plugin = this.getPluginByPath(pluginNameOrPath);
    if (!plugin) {
      // If not found by path, try by name
      const plugins = this.getPluginsByName(pluginNameOrPath);
      if (plugins.length === 1) {
        plugin = plugins[0];
      } else if (plugins.length > 1) {
        throw new Error(
          `Multiple plugins found with name '${pluginNameOrPath}'. Please specify the full path.`
        );
      } else {
        throw new Error(`Plugin not found: ${pluginNameOrPath}`);
      }
    }
    // Delegate reloading to FileManager using the plugin's path
    await this.fileManager.reloadPlugin(plugin.fullPath);
  }
}

export { PluginManager };
