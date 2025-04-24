import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as fsPromises from 'fs/promises';
import { bundleJavaScript, bundleTypeScript, copyLuaFile } from './bundler.js';

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

  if (pluginPaths.length === 0) {
    console.warn('No plugin paths provided to parsePluginPathsIntoPlugins');
    return plugins;
  }

  // We need a consistent base plugins directory to calculate relative paths
  const pluginsDir = path.normalize(path.dirname(path.dirname(pluginPaths[0])));
  console.debug(`Base plugins directory: ${pluginsDir}`);

  for (const pluginPath of pluginPaths) {
    console.debug(`Processing plugin path: ${pluginPath}`);
    const pluginJsonPath = path.join(pluginPath, 'plugin.json');
    console.debug(`Looking for plugin.json at: ${pluginJsonPath}`);

    try {
      // Check if the file exists first
      if (!fs.existsSync(pluginJsonPath)) {
        console.warn(`Plugin.json file not found at path: ${pluginJsonPath}`);
        continue;
      }

      const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
      const normalizedPluginPath = path.normalize(pluginPath);
      console.debug(`Normalized plugin path: ${normalizedPluginPath}`);

      // Calculate the correct path relative to the plugins directory
      const relativePath = path.relative(pluginsDir, normalizedPluginPath);
      console.debug(`Relative path: ${relativePath}`);

      // Normalize path separators to forward slashes for cross-platform consistency
      const consistentPath = relativePath.replace(/\\/g, '/');
      console.debug(`Consistent path: ${consistentPath}`);

      const plugin: Plugin = {
        name: pluginJson.name,
        pathFromPluginsDir: consistentPath,
        hasHtml: fs.existsSync(path.join(pluginPath, 'html', 'Page.tsx')),
        fullPath: normalizedPluginPath, // Store the full normalized path
        files: [], // Initialize empty files array
      };
      console.debug(`Created plugin object: ${JSON.stringify(plugin)}`);
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

  // If pluginJsonData is null, return empty result
  if (pluginJsonData === null) {
    console.warn(
      `No plugin JSON data available for ${path.basename(
        pluginPath
      )}, returning empty script list`
    );
    return result;
  }

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

/**
 * Read and parse plugin JSON file
 */
export function readPluginJson(jsonPath: string) {
  try {
    console.debug(`Attempting to read plugin.json from: ${jsonPath}`);
    console.debug(`Absolute path: ${path.resolve(jsonPath)}`);

    // Check if the file exists first
    if (!fs.existsSync(jsonPath)) {
      console.warn(`Plugin.json file not found at path: ${jsonPath}`);

      // Try to list the directory contents to see what's there
      try {
        const dirPath = path.dirname(jsonPath);
        console.debug(`Directory contents of ${dirPath}:`);
        const files = fs.readdirSync(dirPath);
        files.forEach((file) => console.debug(`- ${file}`));
      } catch (dirErr) {
        console.debug(`Could not read directory: ${dirErr}`);
      }

      return null;
    }

    const pluginJsonContent = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(pluginJsonContent);
  } catch (err) {
    console.error(`Error reading plugin.json at ${jsonPath}:`, err);
    console.debug(`Absolute path: ${path.resolve(jsonPath)}`);
    throw err;
  }
}

/**
 * Helper function to determine which category a file belongs to
 * Cross-platform compatible
 */
function getFileCategory(
  filePath: string
): 'client' | 'server' | 'shared' | 'translations' | null {
  // Normalize the path to ensure consistent separators
  const normalizedPath = path.normalize(filePath);

  // Create normalized category prefixes with proper separators
  const clientPrefix = path.normalize('client' + path.sep);
  const serverPrefix = path.normalize('server' + path.sep);
  const sharedPrefix = path.normalize('shared' + path.sep);
  const translationsPrefix = path.normalize('translations' + path.sep);

  // Check if the path starts with any of the category prefixes
  if (normalizedPath.startsWith(clientPrefix)) {
    return 'client';
  } else if (normalizedPath.startsWith(serverPrefix)) {
    return 'server';
  } else if (normalizedPath.startsWith(sharedPrefix)) {
    return 'shared';
  } else if (normalizedPath.startsWith(translationsPrefix)) {
    return 'translations';
  }

  return null;
}

/**
 * Calculate output paths and directories for a plugin
 */
export function getPluginOutputInfo(plugin: any, distDir: string) {
  console.log(
    `getPluginOutputInfo called for plugin:`,
    JSON.stringify(plugin, null, 2)
  );

  // Check if plugin has a fullPath property
  if (!plugin.fullPath) {
    console.log(
      `Plugin ${plugin.name || 'unknown'} does not have a fullPath property`
    );
  }

  // Check if plugin.json exists at the expected path
  if (plugin.fullPath) {
    const pluginJsonPath = path.join(plugin.fullPath, 'plugin.json');
    console.log(`Checking if plugin.json exists at: ${pluginJsonPath}`);
    console.log(`Absolute path: ${path.resolve(pluginJsonPath)}`);
    console.log(`File exists: ${fs.existsSync(pluginJsonPath)}`);

    // List directory contents
    try {
      const dirPath = plugin.fullPath;
      console.log(`Directory contents of ${dirPath}:`);
      const files = fs.readdirSync(dirPath);
      files.forEach((file) => console.log(`- ${file}`));
    } catch (dirErr) {
      console.log(`Could not read directory: ${dirErr}`);
    }
  }

  const normalizedPluginPath = path.normalize(plugin.pathFromPluginsDir);
  const pluginsPathNormalized = path.normalize('plugins');
  const pathContainsPluginsPrefix =
    normalizedPluginPath.startsWith(pluginsPathNormalized) ||
    normalizedPluginPath.startsWith(pluginsPathNormalized + path.sep);

  // Calculate relative path consistently
  let pluginRelativePath = normalizedPluginPath;
  if (pathContainsPluginsPrefix) {
    // Strip the 'plugins/' prefix to place resources directly in dist
    pluginRelativePath = path.relative(
      pluginsPathNormalized,
      normalizedPluginPath
    );
    console.log(
      `Stripped 'plugins/' prefix from path: ${normalizedPluginPath} -> ${pluginRelativePath}`
    );
  } else if (plugin.name === 'core') {
    // Special case for the core plugin
    pluginRelativePath = 'core';
  }

  // Final output directory
  const outputDir = path.join(distDir, pluginRelativePath);

  console.log(`Output info for plugin ${plugin.name || 'unknown'}:`, {
    pluginRelativePath,
    outputDir,
    manifestPath: path.join(distDir, pluginRelativePath, 'fxmanifest.lua'),
  });

  return {
    pluginRelativePath,
    outputDir,
    manifestPath: path.join(distDir, pluginRelativePath, 'fxmanifest.lua'),
  };
}

/**
 * Ensure directory exists
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
    console.log(`Created/verified directory: ${dirPath}`);
  } catch (err) {
    console.error(`Error creating directory ${dirPath}:`, err);
    throw err;
  }
}

/**
 * Process a single file based on its type
 */
export async function processFile(file: any, outputDir: string) {
  // Skip plugin.json as it's handled separately
  if (file.isPluginJsonFile) {
    return null;
  }

  const fileExt = path.extname(file.name).toLowerCase();
  // Calculate the output path relative to the output directory, removing the 'src/core' part for core plugin files
  let relativeFilePath = file.pathFromPluginDir;
  // Check if the file path starts with 'src/core/' (case-insensitive and platform-independent)
  if (
    relativeFilePath
      .toLowerCase()
      .startsWith(path.join('src', 'core').toLowerCase() + path.sep)
  ) {
    relativeFilePath = path.relative(
      path.join('src', 'core'),
      relativeFilePath
    );
  }
  const outputPath = path.join(outputDir, relativeFilePath);
  const outputPathWithCorrectExt = outputPath.replace(/\.(ts|tsx)$/, '.js');

  // Ensure output directory exists
  await ensureDirectoryExists(path.dirname(outputPath));

  try {
    switch (fileExt) {
      case '.ts':
        // Skip .d.ts files
        if (file.name.endsWith('.d.ts')) {
          return null;
        }
        // For TSX files (React components)
        if (file.name.endsWith('.tsx')) {
          await bundleTypeScript(
            file.fullPath,
            outputPath.replace('.tsx', '.js'),
            true
          );
        } else {
          await bundleTypeScript(
            file.fullPath,
            outputPath.replace('.ts', '.js')
          );
        }
        break;
      case '.js':
        await bundleJavaScript(file.fullPath, outputPath);
        break;
      case '.lua':
        await copyLuaFile(file.fullPath, outputPath);
        break;
      default:
        // Copy other files directly
        await fsPromises.copyFile(file.fullPath, outputPath);
        break;
    }

    return {
      sourcePath: file.pathFromPluginDir,
      outputPath: path.relative(outputDir, outputPathWithCorrectExt),
      category: getFileCategory(file.pathFromPluginDir),
    };
  } catch (err) {
    console.error(`Error processing file ${file.fullPath}:`, err);
    return null;
  }
}

/**
 * Organize processed files by category
 */
export function categorizeGeneratedFiles(processedFiles: any[]) {
  const generatedFiles: {
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
      generatedFiles[file.category as keyof typeof generatedFiles].push(
        file.outputPath
      );
    });

  return generatedFiles;
}
