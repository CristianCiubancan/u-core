/**
 * Script utility functions for working with script files
 *
 * This file is maintained for backward compatibility.
 * New code should use the ScriptProcessor class instead.
 */
import { scriptProcessor } from './ScriptProcessor.js';
import { ScriptFiles, PluginFile } from '../../core/types.js';

/**
 * Get all matching script files from a plugin based on patterns in the plugin.json
 * @param pluginJsonData Plugin JSON configuration
 * @param pluginPath Full path to the plugin directory
 * @returns Object containing arrays of client, server, and shared script files
 */
export function getPluginScripts(
  pluginJsonData: any,
  pluginPath: string
): ScriptFiles {
  return scriptProcessor.getPluginScripts(pluginJsonData, pluginPath);
}

/**
 * Process a single file based on its type
 * @param file File object to process
 * @param outputDir Output directory
 * @returns Processed file information or null if skipped
 */
export async function processFile(file: PluginFile, outputDir: string) {
  return scriptProcessor.processFile(file, outputDir);
}

/**
 * Categorize processed files by type
 * @param processedFiles Array of processed files
 * @returns Object with files categorized by type
 */
export function categorizeFiles(processedFiles: any[]) {
  return scriptProcessor.categorizeFiles(processedFiles);
}
