import { FileManager } from './FileManager.js';
import { PluginManifest, BasicPluginManifest } from '../types/Manifest.js';
import { Plugin } from '../types/Plugin.js';
import * as path from 'path';

/**
 * Manifest manager
 * This class provides functionality to load, parse, and manage plugin manifests
 */
class ManifestManager {
  private fileManager: FileManager;
  private manifests: Map<string, PluginManifest> = new Map();
  private initialized: boolean = false;

  /**
   * Creates a new ManifestManager instance
   * @param fileManager The FileManager instance to use for file operations
   */
  constructor(fileManager: FileManager) {
    this.fileManager = fileManager;
  }

  /**
   * Initializes the manifest manager
   * Must be called before using other methods
   */
  async initialize(): Promise<void> {
    try {
      // Load all plugins from file manager
      const plugins = this.fileManager.getAllPlugins();

      // Load manifests for all plugins
      await Promise.all(
        plugins.map((plugin) => this.loadManifestForPlugin(plugin))
      );

      this.initialized = true;
      console.log(
        `ManifestManager initialized with ${this.manifests.size} manifests`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Error initializing ManifestManager:', error);
      throw new Error(`Failed to initialize ManifestManager: ${errorMessage}`);
    }
  }

  /**
   * Loads the manifest for a specific plugin
   * @param plugin The plugin to load the manifest for
   */
  async loadManifestForPlugin(
    plugin: Plugin
  ): Promise<PluginManifest | undefined> {
    try {
      const manifestPath = path.join(plugin.fullPath, 'plugin.json');

      // Attempt to read and parse the manifest file
      const manifestContent = await this.fileManager.readFile(manifestPath);
      const manifest = JSON.parse(manifestContent) as PluginManifest;

      // Validate the manifest
      if (!manifest.name) {
        console.warn(
          `Warning: Invalid manifest for plugin ${plugin.pluginName} - missing name field`
        );
        manifest.name = plugin.pluginName; // Set a default name if missing
      }

      // Store the manifest both in our map and in the plugin object
      this.manifests.set(plugin.fullPath, manifest);
      plugin.manifest = manifest;

      return manifest;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Warning: Failed to load manifest for plugin ${plugin.pluginName}: ${errorMessage}`
      );

      // Create and return a basic default manifest
      const defaultManifest: BasicPluginManifest = {
        name: plugin.pluginName,
      };

      // Store the default manifest
      this.manifests.set(plugin.fullPath, defaultManifest);
      plugin.manifest = defaultManifest;

      return defaultManifest;
    }
  }

  /**
   * Gets the manifest for a plugin
   * @param pluginNameOrPath The name or path of the plugin
   */
  getManifest(pluginNameOrPath: string): PluginManifest | undefined {
    this.ensureInitialized();

    // Check if it's a path or a name
    if (pluginNameOrPath.includes(path.sep)) {
      // It's a path
      return this.manifests.get(this.normalizePath(pluginNameOrPath));
    } else {
      // It's a name, try to find the plugin first
      const plugin = this.fileManager.getPlugin(pluginNameOrPath);
      if (plugin) {
        return this.manifests.get(plugin.fullPath);
      }
      return undefined;
    }
  }

  /**
   * Updates the manifest for a plugin
   * @param pluginNameOrPath The name or path of the plugin
   * @param manifest The updated manifest data
   */
  async updateManifest(
    pluginNameOrPath: string,
    manifest: PluginManifest
  ): Promise<boolean> {
    this.ensureInitialized();

    let plugin: Plugin | undefined;

    // Check if it's a path or a name
    if (pluginNameOrPath.includes(path.sep)) {
      plugin = this.fileManager.getPluginByPath(pluginNameOrPath);
    } else {
      plugin = this.fileManager.getPlugin(pluginNameOrPath);
    }

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginNameOrPath}`);
    }

    try {
      // Write the updated manifest to the plugin.json file
      const manifestPath = path.join(plugin.fullPath, 'plugin.json');
      await this.fileManager.writeFile(
        manifestPath,
        JSON.stringify(manifest, null, 2)
      );

      // Update the manifest in our map and in the plugin object
      this.manifests.set(plugin.fullPath, manifest);
      plugin.manifest = manifest;

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error updating manifest for plugin ${plugin.pluginName}:`,
        error
      );
      throw new Error(`Failed to update manifest: ${errorMessage}`);
    }
  }

  /**
   * Creates a new manifest for a plugin
   * @param plugin The plugin to create the manifest for
   * @param manifest The manifest data
   */
  async createManifest(
    plugin: Plugin,
    manifest: PluginManifest
  ): Promise<boolean> {
    try {
      // Ensure the plugin doesn't already have a manifest
      const manifestPath = path.join(plugin.fullPath, 'plugin.json');

      // Write the manifest to the plugin.json file
      await this.fileManager.writeFile(
        manifestPath,
        JSON.stringify(manifest, null, 2)
      );

      // Store the manifest in our map and in the plugin object
      this.manifests.set(plugin.fullPath, manifest);
      plugin.manifest = manifest;

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error creating manifest for plugin ${plugin.pluginName}:`,
        error
      );
      throw new Error(`Failed to create manifest: ${errorMessage}`);
    }
  }

  /**
   * Gets all manifests
   */
  getAllManifests(): Map<string, PluginManifest> {
    this.ensureInitialized();
    return new Map(this.manifests);
  }

  /**
   * Refreshes a specific manifest
   * @param pluginNameOrPath The name or path of the plugin
   */
  async refreshManifest(
    pluginNameOrPath: string
  ): Promise<PluginManifest | undefined> {
    this.ensureInitialized();

    let plugin: Plugin | undefined;

    // Check if it's a path or a name
    if (pluginNameOrPath.includes(path.sep)) {
      plugin = this.fileManager.getPluginByPath(pluginNameOrPath);
    } else {
      plugin = this.fileManager.getPlugin(pluginNameOrPath);
    }

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginNameOrPath}`);
    }

    // Reload the manifest for this plugin
    return await this.loadManifestForPlugin(plugin);
  }

  /**
   * Refreshes all manifests
   */
  async refreshAllManifests(): Promise<void> {
    // Clear existing data
    this.manifests.clear();

    // Reload all manifests
    const plugins = this.fileManager.getAllPlugins();
    await Promise.all(
      plugins.map((plugin) => this.loadManifestForPlugin(plugin))
    );

    console.log(`Refreshed ${this.manifests.size} manifests`);
  }

  /**
   * Validates a manifest against the expected schema
   * @param manifest The manifest to validate
   */
  validateManifest(manifest: PluginManifest): string[] {
    const errors: string[] = [];

    // Check required fields
    if (!manifest.name) {
      errors.push('Missing required field: name');
    }

    // Check data types
    if (manifest.version && typeof manifest.version !== 'string') {
      errors.push('Invalid type for field: version (expected string)');
    }

    if (manifest.description && typeof manifest.description !== 'string') {
      errors.push('Invalid type for field: description (expected string)');
    }

    if (manifest.author && typeof manifest.author !== 'string') {
      errors.push('Invalid type for field: author (expected string)');
    }

    // Check array fields
    if (manifest.games && !Array.isArray(manifest.games)) {
      errors.push('Invalid type for field: games (expected array)');
    }

    if (manifest.dependencies && !Array.isArray(manifest.dependencies)) {
      errors.push('Invalid type for field: dependencies (expected array)');
    }

    // Check complex fields
    if (manifest.client_scripts) {
      if (
        typeof manifest.client_scripts !== 'string' &&
        !Array.isArray(manifest.client_scripts)
      ) {
        errors.push(
          'Invalid type for field: client_scripts (expected string or array)'
        );
      }
    }

    if (manifest.server_scripts) {
      if (
        typeof manifest.server_scripts !== 'string' &&
        !Array.isArray(manifest.server_scripts)
      ) {
        errors.push(
          'Invalid type for field: server_scripts (expected string or array)'
        );
      }
    }

    if (manifest.shared_scripts) {
      if (
        typeof manifest.shared_scripts !== 'string' &&
        !Array.isArray(manifest.shared_scripts)
      ) {
        errors.push(
          'Invalid type for field: shared_scripts (expected string or array)'
        );
      }
    }

    return errors;
  }

  /**
   * Helper method to ensure the manager is initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'ManifestManager must be initialized before use. Call initialize() first.'
      );
    }
  }

  /**
   * Normalizes a path for consistent handling
   * @param filePath The path to normalize
   * @private
   */
  private normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }
}

export { ManifestManager };
