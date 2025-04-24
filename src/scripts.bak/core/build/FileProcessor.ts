/**
 * File processor
 */
import * as path from 'path';
import { FileCategory, FileSystem, Logger, PluginFile, ProcessedFile } from '../types.js';
import { FileSystemImpl } from '../../utils/fs/FileSystemImpl.js';
import { TypeScriptBundler } from './bundlers/TypeScriptBundler.js';
import { JavaScriptBundler } from './bundlers/JavaScriptBundler.js';

/**
 * File processor
 */
export class FileProcessor {
  private fs: FileSystem;
  private logger: Logger;
  private tsBundle: TypeScriptBundler;
  private jsBundle: JavaScriptBundler;

  /**
   * Create a new file processor
   * @param fs File system
   * @param logger Logger
   */
  constructor(fs: FileSystem = new FileSystemImpl(), logger: Logger) {
    this.fs = fs;
    this.logger = logger;
    this.tsBundle = new TypeScriptBundler(fs, logger);
    this.jsBundle = new JavaScriptBundler(fs, logger);
  }

  /**
   * Process a file
   * @param file File to process
   * @param outputDir Output directory
   * @returns Processed file information
   */
  async processFile(file: PluginFile, outputDir: string): Promise<ProcessedFile | null> {
    this.logger.debug(`Processing file: ${file.fullPath}`);
    
    try {
      // Skip plugin.json as it's handled separately
      if (file.isPluginJsonFile) {
        return null;
      }
      
      const fileExt = path.extname(file.name).toLowerCase();
      
      // Calculate the output path
      let relativeFilePath = file.pathFromPluginDir;
      
      // Check if the file path starts with 'src/core/'
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
      
      // Ensure the output directory exists
      await this.fs.ensureDir(path.dirname(path.join(outputDir, relativeFilePath)));
      
      // Calculate the output path
      const outputPath = path.join(outputDir, relativeFilePath);
      
      // Calculate the output path with the correct extension
      let outputPathWithCorrectExt = outputPath;
      
      // Process the file based on its extension
      switch (fileExt) {
        case '.ts':
          // Skip .d.ts files
          if (file.name.endsWith('.d.ts')) {
            return null;
          }
          
          // For TSX files (React components)
          if (file.name.endsWith('.tsx')) {
            outputPathWithCorrectExt = outputPath.replace('.tsx', '.js');
            await this.tsBundle.bundle(file.fullPath, outputPathWithCorrectExt, { isReact: true });
          } else {
            outputPathWithCorrectExt = outputPath.replace('.ts', '.js');
            await this.tsBundle.bundle(file.fullPath, outputPathWithCorrectExt);
          }
          break;
          
        case '.js':
          await this.jsBundle.bundle(file.fullPath, outputPath);
          break;
          
        case '.lua':
          // Copy Lua files directly
          await this.fs.copyFile(file.fullPath, outputPath);
          break;
          
        default:
          // Copy other files directly
          await this.fs.copyFile(file.fullPath, outputPath);
          break;
      }
      
      // Return processed file information
      return {
        sourcePath: file.pathFromPluginDir,
        outputPath: path.relative(outputDir, outputPathWithCorrectExt),
        category: this.getFileCategory(file.pathFromPluginDir),
      };
    } catch (error) {
      this.logger.error(`Error processing file ${file.fullPath}:`, error);
      throw error;
    }
  }

  /**
   * Get file category
   * @param filePath File path
   * @returns File category
   */
  private getFileCategory(filePath: string): FileCategory {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Check if the file is in the client directory
    if (normalizedPath.includes('/client/')) {
      return FileCategory.Client;
    }
    
    // Check if the file is in the server directory
    if (normalizedPath.includes('/server/')) {
      return FileCategory.Server;
    }
    
    // Check if the file is in the shared directory
    if (normalizedPath.includes('/shared/')) {
      return FileCategory.Shared;
    }
    
    // Default to other
    return FileCategory.Other;
  }

  /**
   * Categorize generated files
   * @param processedFiles Processed files
   * @returns Categorized files
   */
  categorizeGeneratedFiles(processedFiles: (ProcessedFile | null)[]): {
    client: string[];
    server: string[];
    shared: string[];
    other: string[];
  } {
    // Filter out null values
    const validFiles = processedFiles.filter((file): file is ProcessedFile => file !== null);
    
    // Categorize files
    const result = {
      client: [] as string[],
      server: [] as string[],
      shared: [] as string[],
      other: [] as string[],
    };
    
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
        case FileCategory.Other:
          result.other.push(file.outputPath);
          break;
      }
    }
    
    return result;
  }
}
