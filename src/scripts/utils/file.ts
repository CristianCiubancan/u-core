import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

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

interface ScriptPatterns {
  client_scripts?: string[];
  server_scripts?: string[];
  shared_scripts?: string[];
  [key: string]: any;
}

interface ScriptFiles {
  client: string[];
  server: string[];
  shared: string[];
}

/**
 * Gets all matching script files from a plugin based on patterns in the plugin.json
 * @param pluginJsonData Plugin JSON configuration
 * @param pluginPath Full path to the plugin directory
 * @returns Object containing arrays of client, server, and shared script files
 */
export function getPluginScripts(
  pluginJsonData: any,
  pluginPath: string
): ScriptFiles {
  // Default result with empty arrays
  const result: ScriptFiles = {
    client: [],
    server: [],
    shared: [],
  };

  // Helper function to resolve glob patterns relative to the plugin directory
  const resolvePatterns = (
    patterns: string[],
    type: 'client' | 'server' | 'shared'
  ) => {
    if (!patterns || !Array.isArray(patterns)) return;

    patterns.forEach((pattern) => {
      try {
        // Make sure the pattern is properly formed for glob
        // If pattern doesn't contain a *, assume it's a direct file reference
        const normalizedPattern = pattern.replace(/\\/g, '/');

        // Resolve the glob pattern relative to the plugin directory
        const matches = glob.sync(normalizedPattern, {
          cwd: pluginPath,
          absolute: false,
          nodir: true,
        });

        // If we have matches, convert them to use consistent path separators
        const normalizedMatches = matches.map((match) =>
          match.replace(/\//g, path.sep)
        );

        // Add all matches to the result array for this type
        result[type].push(...normalizedMatches);
      } catch (error) {
        console.warn(
          `Error processing pattern "${pattern}" for ${type} scripts:`,
          error
        );
      }
    });
  };

  // Process client scripts
  if (pluginJsonData.client_scripts) {
    resolvePatterns(pluginJsonData.client_scripts, 'client');
  }

  // Process server scripts
  if (pluginJsonData.server_scripts) {
    resolvePatterns(pluginJsonData.server_scripts, 'server');
  }

  // Process shared scripts
  if (pluginJsonData.shared_scripts) {
    resolvePatterns(pluginJsonData.shared_scripts, 'shared');
  }

  return result;
}
