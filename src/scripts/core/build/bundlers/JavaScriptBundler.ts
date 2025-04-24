/**
 * JavaScript bundler
 */
import * as esbuild from 'esbuild';
import * as path from 'path';
import { Bundler, FileSystem, Logger } from '../../types.js';
import { FileSystemImpl } from '../../../utils/fs/FileSystemImpl.js';

/**
 * JavaScript bundler options
 */
export interface JavaScriptBundlerOptions {
  /** Whether to minify output */
  minify?: boolean;
  /** Whether to generate source maps */
  sourceMaps?: boolean;
}

/**
 * JavaScript bundler
 */
export class JavaScriptBundler implements Bundler {
  private fs: FileSystem;
  private logger: Logger;

  /**
   * Create a new JavaScript bundler
   * @param fs File system
   * @param logger Logger
   */
  constructor(fs: FileSystem = new FileSystemImpl(), logger: Logger) {
    this.fs = fs;
    this.logger = logger;
  }

  /**
   * Bundle a JavaScript file
   * @param inputFile Input file path
   * @param outputFile Output file path
   * @param options Bundler options
   */
  async bundle(
    inputFile: string,
    outputFile: string,
    options: JavaScriptBundlerOptions = {}
  ): Promise<void> {
    this.logger.debug(`Bundling JavaScript file: ${inputFile} -> ${outputFile}`);
    
    try {
      const minify = options.minify ?? false;
      const sourceMaps = options.sourceMaps ?? true;
      
      // Determine if this is a server-side script by checking the path
      const isServerScript =
        inputFile.includes('/server/') || inputFile.includes('\\server\\');
      
      // List of packages to not inline - for server scripts, make Node.js modules external
      const externalPackages: string[] = isServerScript
        ? [
            'http',
            'https',
            'url',
            'fs',
            'path',
            'os',
            'crypto',
            'buffer',
            'stream',
            'util',
            'events',
            'zlib',
            'net',
            'tls',
            'dns',
            'child_process',
          ]
        : [];
      
      // Ensure output directory exists
      await this.fs.ensureDir(path.dirname(outputFile));
      
      // Bundle the file
      const result = await esbuild.build({
        entryPoints: [inputFile],
        bundle: true,
        outfile: outputFile,
        format: 'iife', // Use IIFE format for FiveM compatibility
        target: 'es2017',
        minify,
        sourcemap: sourceMaps ? 'external' : false,
        external: externalPackages,
        // Use node platform for server scripts, browser platform for client scripts
        platform: isServerScript ? 'node' : 'browser',
      });
      
      // Check for errors
      if (result.errors.length > 0) {
        this.logger.error(`Errors bundling ${inputFile}:`, result.errors);
        throw new Error(`Failed to bundle ${inputFile}: ${result.errors.join(', ')}`);
      }
      
      // Verify the file was created
      const exists = await this.fs.exists(outputFile);
      
      if (!exists) {
        throw new Error(`Failed to verify file exists after bundling: ${outputFile}`);
      }
      
      this.logger.debug(`Successfully bundled JavaScript file: ${inputFile} -> ${outputFile}`);
    } catch (error) {
      this.logger.error(`Error bundling JavaScript file ${inputFile}:`, error);
      throw error;
    }
  }
}
