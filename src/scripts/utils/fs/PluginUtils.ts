/**
 * Plugin utility functions for working with plugins and their files
 */
import { FileSystemImpl } from './FileSystemImpl.js';
import { joinPath, normalizePath, getFileCategory } from './PathUtils.js';
import { Plugin, PluginFile } from '../../core/types.js';

// Create a file system instance for use in this module
const fs = new FileSystemImpl();

/**
 * Find all plugin paths within the specified directory
 * @param dirPath The root directory to search for plugins
 * @returns Array of plugin paths
 */
export function findPluginPaths(dirPath: string): string[] {
  return fs.findPathsWithFile(dirPath, 'plugin.json');
}

/**
 * Parse plugin paths into Plugin objects
 * @param pluginPaths Array of plugin directory paths
 * @returns Array of Plugin objects
 */
export function parsePluginPaths(pluginPaths: string[]): Plugin[] {
  const plugins: Plugin[] = [];

  if (pluginPaths.length === 0) {
    console.warn('No plugin paths provided to parsePluginPaths');
    return plugins;
  }

  // We need a consistent base plugins directory to calculate relative paths
  const pluginsDir = normalizePath(
    joinPath(pluginPaths[0], '..', '..')
  );

  for (const pluginPath of pluginPaths) {
    const pluginJsonPath = joinPath(pluginPath, 'plugin.json');

    try {
      // Check if the file exists first
      if (!fs.existsSync(pluginJsonPath)) {
        console.warn(`Plugin.json file not found at path: ${pluginJsonPath}`);
        continue;
      }

      const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
      const normalizedPluginPath = normalizePath(pluginPath);

      // Calculate the correct path relative to the plugins directory
      const relativePath = normalizePath(
        joinPath(normalizedPluginPath).substring(pluginsDir.length + 1)
      );

      const plugin: Plugin = {
        name: pluginJson.name,
        pathFromPluginsDir: relativePath,
        hasHtml: fs.existsSync(joinPath(pluginPath, 'html', 'Page.tsx')),
        fullPath: normalizedPluginPath,
        files: [], // Initialize empty files array
      };
      plugins.push(plugin);
    } catch (error) {
      console.error(`Error parsing plugin.json at ${pluginJsonPath}:`, error);
    }
  }

  return plugins;
}

/**
 * Parse files within a plugin directory into File objects
 * @param pluginDirPath Plugin directory path
 * @returns Array of File objects
 */
export function parsePluginFiles(pluginDirPath: string): PluginFile[] {
  const files: string[] = fs.getFilePaths(pluginDirPath);
  const pluginDirNormalized = normalizePath(pluginDirPath);
  const result: PluginFile[] = [];

  for (const filePath of files) {
    const normalizedFilePath = normalizePath(filePath);
    const fileName = normalizedFilePath.split('/').pop() || '';
    const isPluginJsonFile = fileName === 'plugin.json';

    // Calculate the path relative to the plugin directory
    let pathFromPluginDir = '';
    if (normalizedFilePath.startsWith(pluginDirNormalized)) {
      pathFromPluginDir = normalizedFilePath.substring(
        pluginDirNormalized.length + 1
      );
    }

    const file: PluginFile = {
      name: fileName,
      pathFromPluginDir: normalizePath(pathFromPluginDir),
      isPluginJsonFile,
      fullPath: normalizedFilePath,
    };

    result.push(file);
  }

  return result;
}

/**
 * Read and parse plugin JSON file
 * @param jsonPath Path to the plugin.json file
 * @returns Parsed plugin JSON data or null if not found
 */
export function readPluginJson(jsonPath: string): any {
  try {
    // Check if the file exists first
    if (!fs.existsSync(jsonPath)) {
      console.warn(`Plugin.json file not found at path: ${jsonPath}`);
      return null;
    }

    const pluginJsonContent = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(pluginJsonContent);
  } catch (err) {
    console.error(`Error reading plugin.json at ${jsonPath}:`, err);
    return null;
  }
}

/**
 * Calculate output paths and directories for a plugin
 * @param plugin Plugin object
 * @param distDir Distribution directory
 * @returns Object with output paths
 */
export function getPluginOutputInfo(plugin: Plugin, distDir: string) {
  const normalizedPluginPath = normalizePath(plugin.pathFromPluginsDir);
  const pluginsPathNormalized = normalizePath('plugins');
  const pathContainsPluginsPrefix =
    normalizedPluginPath.startsWith(pluginsPathNormalized) ||
    normalizedPluginPath.startsWith(pluginsPathNormalized + '/');

  // Calculate relative path consistently
  let pluginRelativePath = normalizedPluginPath;
  if (pathContainsPluginsPrefix) {
    // Strip the 'plugins/' prefix to place resources directly in dist
    pluginRelativePath = normalizedPluginPath.substring(
      pluginsPathNormalized.length + 1
    );
  } else if (plugin.name === 'core') {
    // Special case for the core plugin
    pluginRelativePath = 'core';
  }

  // Final output directory
  const outputDir = joinPath(distDir, pluginRelativePath);

  return {
    pluginRelativePath,
    outputDir,
    manifestPath: joinPath(distDir, pluginRelativePath, 'fxmanifest.lua'),
  };
}

/**
 * Categorize processed files by their type (client, server, shared, translations)
 * @param processedFiles Array of processed files
 * @returns Object with categorized files
 */
export function categorizeFiles(processedFiles: any[]) {
  const categorized: {
    client: string[];
    server: string[];
    shared: string[];
    translations: string[];
  } = {
    client: [],
    server: [],
    shared: [],
    translations: [],
  };

  processedFiles
    .filter((file) => file && file.category)
    .forEach((file) => {
      categorized[file.category as keyof typeof categorized].push(
        file.outputPath
      );
    });

  return categorized;
}
