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
 * Gets all matching script files from a plugin directory
 * @param pluginPath Full path to the plugin directory
 * @param pluginJsonData Plugin JSON configuration (optional, will be read from pluginPath if not provided)
 * @returns Object containing arrays of client, server, and shared script files
 */
export function getPluginScripts(
  pluginPath: string,
  pluginJsonData?: any
): ScriptFiles {
  // Default result with empty arrays
  const result: ScriptFiles = {
    client: [],
    server: [],
    shared: [],
  };

  // Read plugin.json if not provided
  if (!pluginJsonData) {
    const jsonPath = path.join(pluginPath, 'plugin.json');
    if (fs.existsSync(jsonPath)) {
      const pluginJsonContent = fs.readFileSync(jsonPath, 'utf8');
      pluginJsonData = JSON.parse(pluginJsonContent);
    } else {
      console.error(`No plugin.json found at ${jsonPath}`);
      return result;
    }
  }

  // Helper function to resolve glob patterns
  function resolveGlobPatterns(baseDir: string, patterns: string[]): string[] {
    const matchedFiles: string[] = [];

    for (const pattern of patterns) {
      const matches = glob.sync(pattern, { cwd: baseDir });
      matchedFiles.push(...matches);
    }

    return matchedFiles;
  }

  // Clone the plugin data for modifications
  const updatedPluginJson: ScriptPatterns = { ...pluginJsonData };

  // Detect actual file extensions in the client directory
  if (pluginJsonData.client_scripts) {
    const clientDir = path.join(pluginPath, 'client');
    if (fs.existsSync(clientDir)) {
      const clientFiles = fs.readdirSync(clientDir);
      const extensions = new Set(clientFiles.map((file) => path.extname(file)));

      // Update client_scripts with actual extensions
      updatedPluginJson.client_scripts = Array.from(extensions)
        .filter((ext) => ext !== '') // Filter out files with no extension
        .map((ext) => `client/*${ext}`);

      // If no extensions were found but the directory exists, include all files
      if (
        updatedPluginJson.client_scripts.length === 0 &&
        clientFiles.length > 0
      ) {
        updatedPluginJson.client_scripts = ['client/*'];
      }
    }
  }

  // Detect actual file extensions in the server directory
  if (pluginJsonData.server_scripts) {
    const serverDir = path.join(pluginPath, 'server');
    if (fs.existsSync(serverDir)) {
      const serverFiles = fs.readdirSync(serverDir);
      const extensions = new Set(serverFiles.map((file) => path.extname(file)));

      // Update server_scripts with actual extensions
      updatedPluginJson.server_scripts = Array.from(extensions)
        .filter((ext) => ext !== '') // Filter out files with no extension
        .map((ext) => `server/*${ext}`);

      // If no extensions were found but the directory exists, include all files
      if (
        updatedPluginJson.server_scripts.length === 0 &&
        serverFiles.length > 0
      ) {
        updatedPluginJson.server_scripts = ['server/*'];
      }
    }
  }

  // Detect actual file extensions in the shared directory
  if (pluginJsonData.shared_scripts) {
    const sharedDir = path.join(pluginPath, 'shared');
    if (fs.existsSync(sharedDir)) {
      const sharedFiles = fs.readdirSync(sharedDir);
      const extensions = new Set(sharedFiles.map((file) => path.extname(file)));

      // Update shared_scripts with actual extensions
      updatedPluginJson.shared_scripts = Array.from(extensions)
        .filter((ext) => ext !== '') // Filter out files with no extension
        .map((ext) => `shared/*${ext}`);

      // If no extensions were found but the directory exists, include all files
      if (
        updatedPluginJson.shared_scripts.length === 0 &&
        sharedFiles.length > 0
      ) {
        updatedPluginJson.shared_scripts = ['shared/*'];
      }
    }
  }

  // Resolve patterns to actual file paths
  if (updatedPluginJson.client_scripts) {
    result.client = resolveGlobPatterns(
      pluginPath,
      updatedPluginJson.client_scripts
    );

    // Optional: log the matched files
    const pluginName = pluginJsonData.name || path.basename(pluginPath);
    console.log(`Client scripts for ${pluginName}:`, result.client);
  }

  if (updatedPluginJson.server_scripts) {
    result.server = resolveGlobPatterns(
      pluginPath,
      updatedPluginJson.server_scripts
    );

    // Optional: log the matched files
    const pluginName = pluginJsonData.name || path.basename(pluginPath);
    console.log(`Server scripts for ${pluginName}:`, result.server);
  }

  if (updatedPluginJson.shared_scripts) {
    result.shared = resolveGlobPatterns(
      pluginPath,
      updatedPluginJson.shared_scripts
    );

    // Optional: log the matched files
    const pluginName = pluginJsonData.name || path.basename(pluginPath);
    console.log(`Shared scripts for ${pluginName}:`, result.shared);
  }

  return result;
}
