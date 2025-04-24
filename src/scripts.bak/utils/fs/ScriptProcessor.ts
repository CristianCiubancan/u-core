/**
 * ScriptProcessor class for processing script files
 */
import { FileSystemImpl } from './FileSystemImpl.js';
import {
  joinPath,
  normalizePath,
  calculateOutputPath,
  getFileCategory,
} from './PathUtils.js';
import {
  ScriptFiles,
  ScriptPatterns,
  PluginFile,
  FileCategory,
  ProcessedFile,
} from '../../core/types.js';
import { bundlerService } from '../bundler/index.js';
import { Logger } from '../../core/types.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';

/**
 * Class for processing script files
 */
export class ScriptProcessor {
  private fs: FileSystemImpl;
  private logger: Logger;

  /**
   * Create a new ScriptProcessor
   * @param fs File system implementation
   * @param logger Logger instance
   */
  constructor(
    fs: FileSystemImpl = new FileSystemImpl(),
    logger: Logger = new ConsoleLogger()
  ) {
    this.fs = fs;
    this.logger = logger;
  }

  /**
   * Get all matching script files from a plugin based on patterns in the plugin.json
   * @param pluginJsonData Plugin JSON configuration
   * @param pluginPath Full path to the plugin directory
   * @returns Object containing arrays of client, server, and shared script files
   */
  getPluginScripts(pluginJsonData: any, pluginPath: string): ScriptFiles {
    // Default result with empty arrays
    const result: ScriptFiles = {
      client: [],
      server: [],
      shared: [],
    };

    // If pluginJsonData is null, return empty result
    if (pluginJsonData === null) {
      this.logger.warn(
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
          const matches = this.fs.globSync(normalizedPattern, {
            cwd: pluginPath,
            absolute: false,
            nodir: true,
          });

          // Add all matches to the result array for this type
          result[type].push(...matches);
        } catch (error) {
          this.logger.warn(
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
  async processFile(
    file: PluginFile,
    outputDir: string
  ): Promise<ProcessedFile | null> {
    // Skip plugin.json as it's handled separately
    if (file.isPluginJsonFile) {
      return null;
    }

    const fileExt = file.name
      .substring(file.name.lastIndexOf('.'))
      .toLowerCase();

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
    await this.fs.ensureDir(joinPath(outputPath, '..'));

    try {
      switch (fileExt) {
        case '.ts':
          // Skip .d.ts files
          if (file.name.endsWith('.d.ts')) {
            return null;
          }
          // For TSX files (React components)
          if (file.name.endsWith('.tsx')) {
            await bundlerService.bundleTypeScript(
              file.fullPath,
              outputPath.replace('.tsx', '.js'),
              true
            );
          } else {
            await bundlerService.bundleTypeScript(
              file.fullPath,
              outputPath.replace('.ts', '.js')
            );
          }
          break;
        case '.js':
          await bundlerService.bundleJavaScript(file.fullPath, outputPath);
          break;
        case '.lua':
          await bundlerService.copyLuaFile(file.fullPath, outputPath);
          break;
        default:
          // Copy other files directly
          await this.fs.copyFile(file.fullPath, outputPath);
          break;
      }

      return {
        sourcePath: file.pathFromPluginDir,
        outputPath: normalizePath(
          outputPathWithCorrectExt.substring(outputDir.length + 1)
        ),
        category: this.convertToFileCategory(
          getFileCategory(file.pathFromPluginDir)
        ),
      };
    } catch (err) {
      this.logger.error(`Error processing file ${file.fullPath}:`, err);
      return null;
    }
  }

  /**
   * Convert string category to FileCategory enum
   * @param category String category or null
   * @returns FileCategory enum value
   */
  private convertToFileCategory(
    category: 'client' | 'server' | 'shared' | 'translations' | null
  ): FileCategory {
    switch (category) {
      case 'client':
        return FileCategory.Client;
      case 'server':
        return FileCategory.Server;
      case 'shared':
        return FileCategory.Shared;
      case 'translations':
      case null:
      default:
        return FileCategory.Other;
    }
  }

  /**
   * Categorize processed files by type
   * @param processedFiles Array of processed files
   * @returns Object with files categorized by type
   */
  categorizeFiles(
    processedFiles: (ProcessedFile | null)[]
  ): Record<string, string[]> {
    // Filter out null values
    const validFiles = processedFiles.filter(Boolean) as ProcessedFile[];

    // Initialize result object
    const result: Record<string, string[]> = {
      client: [],
      server: [],
      shared: [],
      files: [],
    };

    // Categorize files
    for (const file of validFiles) {
      switch (file.category) {
        case FileCategory.Client:
          result.client.push(file.outputPath);
          break;
        case FileCategory.Server:
          result.server.push(file.outputPath);
          break;
        case FileCategory.Shared:
          result.shared.push(file.outputPath);
          break;
        default:
          // Add to files array for other types
          result.files.push(file.outputPath);
          break;
      }
    }

    return result;
  }
}

// Export a singleton instance for backward compatibility
export const scriptProcessor = new ScriptProcessor();

// Export individual functions for backward compatibility
export const getPluginScripts =
  scriptProcessor.getPluginScripts.bind(scriptProcessor);
export const processFile = scriptProcessor.processFile.bind(scriptProcessor);
export const categorizeFiles =
  scriptProcessor.categorizeFiles.bind(scriptProcessor);
