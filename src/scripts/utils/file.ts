import * as fs from 'fs';
import * as path from 'path';

export interface File {
  name: string;
  pathFromPluginDir: string;
  isPluginJsonFile: boolean;
  fullPath: string;
}

export interface Plugin {
  name: string;
  pathFromPluginsDir: string;
  hasHtml: boolean;
  fullPath?: string;
  files: File[]; // Added files array to store plugin files
}

/**
 * Finds all plugin paths within the specified directory
 * @param dirPath The root directory to search for plugins
 * @returns Object containing array of plugin paths
 */
export function getPluginsPaths(dirPath: string): { pluginPaths: string[] } {
  const pluginPaths: string[] = [];
  const pluginJsonFileName = 'plugin.json';

  // Helper function to recursively scan directories for plugin.json files
  function scanDirectory(directory: string) {
    try {
      const items = fs.readdirSync(directory);

      for (const item of items) {
        const itemPath = path.join(directory, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          scanDirectory(itemPath); // Recursively scan subdirectories
        } else if (stats.isFile() && item === pluginJsonFileName) {
          // When we find a plugin.json file, add its parent directory to pluginPaths
          const pluginDir = path.dirname(itemPath);
          if (!pluginPaths.includes(pluginDir)) {
            pluginPaths.push(pluginDir);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory: ${directory}`, error);
    }
  }

  // Start scanning from the provided directory path
  scanDirectory(dirPath);

  return { pluginPaths };
}

/**
 * Parses plugin paths into Plugin objects
 * @param pluginPaths Array of plugin directory paths
 * @returns Array of Plugin objects
 */
export function parsePluginPathsIntoPlugins(pluginPaths: string[]): Plugin[] {
  const plugins: Plugin[] = [];
  // We need a consistent base plugins directory to calculate relative paths
  const pluginsDir = path.normalize(path.dirname(path.dirname(pluginPaths[0])));

  for (const pluginPath of pluginPaths) {
    const pluginJsonPath = path.join(pluginPath, 'plugin.json');
    try {
      const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
      const normalizedPluginPath = path.normalize(pluginPath);

      // Calculate the correct path relative to the plugins directory
      const relativePath = path.relative(pluginsDir, normalizedPluginPath);

      // Normalize path separators to forward slashes for cross-platform consistency
      const consistentPath = relativePath.replace(/\\/g, '/');

      const plugin: Plugin = {
        name: pluginJson.name,
        pathFromPluginsDir: consistentPath,
        hasHtml: fs.existsSync(path.join(pluginPath, 'html', 'Page.tsx')),
        fullPath: normalizedPluginPath, // Store the full normalized path
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
 * Gets all file paths within a directory recursively
 * @param dirPath Directory to scan for files
 * @returns Array of file paths
 */
export function getFilePaths(dirPath: string): string[] {
  const filePaths: string[] = [];

  // Helper function to recursively scan directories
  function scanDirectory(directory: string) {
    try {
      const items = fs.readdirSync(directory);

      for (const item of items) {
        const itemPath = path.join(directory, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          scanDirectory(itemPath); // Recursively scan subdirectories
        } else if (stats.isFile()) {
          filePaths.push(itemPath); // Add file path to the result
        }
      }
    } catch (error) {
      console.error(`Error scanning directory: ${directory}`, error);
    }
  }

  // Start scanning from the provided directory path
  scanDirectory(dirPath);

  return filePaths;
}

/**
 * Parses files within a plugin directory into File objects
 * @param pluginDirPath Plugin directory path
 * @returns Array of File objects
 */
export function parseFilePathsIntoFiles(pluginDirPath: string): File[] {
  const files: string[] = getFilePaths(pluginDirPath);
  const pluginDirNormalized = path.normalize(pluginDirPath);
  const result: File[] = [];

  for (const filePath of files) {
    const normalizedFilePath = path.normalize(filePath);
    const fileName = path.basename(normalizedFilePath);
    const isPluginJsonFile = fileName === 'plugin.json';

    // Calculate the path relative to the plugin directory
    let pathFromPluginDir = '';
    if (normalizedFilePath.startsWith(pluginDirNormalized)) {
      pathFromPluginDir = normalizedFilePath.substring(
        pluginDirNormalized.length + 1
      );
    }

    // Normalize path separators to forward slashes for cross-platform consistency
    const consistentPath = pathFromPluginDir.replace(/\\/g, '/');

    const file: File = {
      name: fileName,
      pathFromPluginDir: consistentPath,
      isPluginJsonFile,
      fullPath: normalizedFilePath,
    };

    result.push(file);
  }

  return result;
}
