/**
 * @deprecated Use the fs module instead
 * This file is kept for backward compatibility and will be removed in a future version
 */
import {
  fileSystem as fsImpl,
  findPluginPaths as findPluginPathsNew,
  parsePluginPaths as parsePluginPathsNew,
  parsePluginFiles as parsePluginFilesNew,
  readPluginJson as readPluginJsonNew,
  getPluginOutputInfo as getPluginOutputInfoNew,
  categorizeFiles as categorizeFilesNew,
  getPluginScripts as getPluginScriptsNew,
  processFile as processFileNew,
  getFileCategory as getFileCategoryNew,
} from './fs/index.js';
import { Plugin, PluginFile } from '../core/types.js';

// Re-export types for backward compatibility
export type File = PluginFile;
export { Plugin };

// Define interfaces for backward compatibility
interface ScriptFiles {
  client: string[];
  server: string[];
  shared: string[];
}

/**
 * Finds all plugin paths within the specified directory
 * @param dirPath The root directory to search for plugins
 * @returns Object containing array of plugin paths
 * @deprecated Use findPluginPaths from fs/index.js instead
 */
export function getPluginsPaths(dirPath: string): { pluginPaths: string[] } {
  return { pluginPaths: findPluginPathsNew(dirPath) };
}

/**
 * Parses plugin paths into Plugin objects
 * @param pluginPaths Array of plugin directory paths
 * @returns Array of Plugin objects
 * @deprecated Use parsePluginPaths from fs/index.js instead
 */
export function parsePluginPathsIntoPlugins(pluginPaths: string[]): Plugin[] {
  return parsePluginPathsNew(pluginPaths);
}

/**
 * Gets all file paths within a directory recursively
 * @param dirPath Directory to scan for files
 * @returns Array of file paths
 * @deprecated Use fileSystem.getFilePaths from fs/index.js instead
 */
export function getFilePaths(dirPath: string): string[] {
  return fsImpl.getFilePaths(dirPath);
}

/**
 * Parses files within a plugin directory into File objects
 * @param pluginDirPath Plugin directory path
 * @returns Array of File objects
 * @deprecated Use parsePluginFiles from fs/index.js instead
 */
export function parseFilePathsIntoFiles(pluginDirPath: string): File[] {
  return parsePluginFilesNew(pluginDirPath);
}

// Define interfaces for backward compatibility
// These are used by other modules that import from file.ts
export interface ScriptPatterns {
  client_scripts?: string[];
  server_scripts?: string[];
  shared_scripts?: string[];
  [key: string]: any;
}

/**
 * Gets all matching script files from a plugin based on patterns in the plugin.json
 * @param pluginJsonData Plugin JSON configuration
 * @param pluginPath Full path to the plugin directory
 * @returns Object containing arrays of client, server, and shared script files
 * @deprecated Use getPluginScripts from fs/index.js instead
 */
export function getPluginScripts(
  pluginJsonData: any,
  pluginPath: string
): ScriptFiles {
  return getPluginScriptsNew(pluginJsonData, pluginPath);
}

/**
 * Read and parse plugin JSON file
 * @param jsonPath Path to the plugin.json file
 * @returns Parsed plugin JSON data or null if not found
 * @deprecated Use readPluginJson from fs/index.js instead
 */
export function readPluginJson(jsonPath: string) {
  return readPluginJsonNew(jsonPath);
}

/**
 * Helper function to determine which category a file belongs to
 * Cross-platform compatible
 * @param filePath Path to check
 * @returns Category of the file (client, server, shared, translations, or null)
 * @deprecated Use getFileCategory from fs/index.js instead
 */
export function getFileCategory(
  filePath: string
): 'client' | 'server' | 'shared' | 'translations' | null {
  return getFileCategoryNew(filePath);
}

/**
 * Calculate output paths and directories for a plugin
 * @param plugin Plugin object
 * @param distDir Distribution directory
 * @returns Object with output paths
 * @deprecated Use getPluginOutputInfo from fs/index.js instead
 */
export function getPluginOutputInfo(plugin: any, distDir: string) {
  return getPluginOutputInfoNew(plugin, distDir);
}

/**
 * Ensure directory exists
 * @param dirPath Directory path
 * @deprecated Use fileSystem.ensureDir from fs/index.js instead
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await fsImpl.ensureDir(dirPath);
}

/**
 * Process a single file based on its type
 * @param file File object to process
 * @param outputDir Output directory
 * @returns Processed file information or null if skipped
 * @deprecated Use processFile from fs/index.js instead
 */
export async function processFile(file: any, outputDir: string) {
  return processFileNew(file, outputDir);
}

/**
 * Organize processed files by category
 * @param processedFiles Array of processed files
 * @returns Object with categorized files
 * @deprecated Use categorizeFiles from fs/index.js instead
 */
export function categorizeGeneratedFiles(processedFiles: any[]) {
  return categorizeFilesNew(processedFiles);
}
