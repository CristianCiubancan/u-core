/**
 * Script utility functions for working with script files
 */
import { FileSystemImpl } from './FileSystemImpl.js';
import { joinPath, normalizePath, calculateOutputPath, getFileCategory } from './PathUtils.js';
import { ScriptFiles, ScriptPatterns, PluginFile } from '../../core/types.js';
import { bundleJavaScript, bundleTypeScript, copyLuaFile } from '../bundler.js';

// Create a file system instance for use in this module
const fs = new FileSystemImpl();

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
  // Default result with empty arrays
  const result: ScriptFiles = {
    client: [],
    server: [],
    shared: [],
  };

  // If pluginJsonData is null, return empty result
  if (pluginJsonData === null) {
    console.warn(
      `No plugin JSON data available for ${pluginPath.split('/').pop()}, returning empty script list`
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
        const normalizedPattern = normalizePath(pattern);

        // Resolve the glob pattern relative to the plugin directory
        const matches = fs.globSync(normalizedPattern, {
          cwd: pluginPath,
          absolute: false,
          nodir: true,
        });

        // Add all matches to the result array for this type
        result[type].push(...matches);
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
 * Process a single file based on its type
 * @param file File object to process
 * @param outputDir Output directory
 * @returns Processed file information or null if skipped
 */
export async function processFile(file: PluginFile, outputDir: string) {
  // Skip plugin.json as it's handled separately
  if (file.isPluginJsonFile) {
    return null;
  }

  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  // Calculate the output path
  let relativeFilePath = file.pathFromPluginDir;
  
  // Check if the file path starts with 'src/core/' (case-insensitive)
  if (relativeFilePath.toLowerCase().startsWith('src/core/')) {
    relativeFilePath = relativeFilePath.substring('src/core/'.length);
  }
  
  const { outputPath, outputPathWithCorrectExt } = calculateOutputPath(
    { pathFromPluginDir: relativeFilePath, name: file.name },
    outputDir
  );

  // Ensure output directory exists
  await fs.ensureDir(joinPath(outputPath, '..'));

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
        await fs.copyFile(file.fullPath, outputPath);
        break;
    }

    return {
      sourcePath: file.pathFromPluginDir,
      outputPath: normalizePath(outputPathWithCorrectExt.substring(outputDir.length + 1)),
      category: getFileCategory(file.pathFromPluginDir),
    };
  } catch (err) {
    console.error(`Error processing file ${file.fullPath}:`, err);
    return null;
  }
}
