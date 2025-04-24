/**
 * BundlerService class for bundling and processing files
 */
import * as path from 'path';
import * as esbuild from 'esbuild';
import * as fsPromises from 'fs/promises';
import { FileSystem } from '../../core/types.js';
import { FileSystemImpl } from '../fs/FileSystemImpl.js';

/**
 * Service for bundling and processing files
 */
export class BundlerService {
  private fs: FileSystem;

  /**
   * Create a new BundlerService
   * @param fs File system implementation
   */
  constructor(fs?: FileSystem) {
    this.fs = fs || new FileSystemImpl();
  }

  /**
   * Determine if a file is a server-side script based on its path
   * @param filePath Path to check
   * @returns Whether the file is a server-side script
   */
  private isServerScript(filePath: string): boolean {
    return filePath.includes('/server/') || filePath.includes('\\server\\');
  }

  /**
   * Get external packages for server-side scripts
   * @param isServerScript Whether the file is a server-side script
   * @returns Array of external package names
   */
  private getExternalPackages(isServerScript: boolean): string[] {
    return isServerScript
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
  }

  /**
   * Verify a file exists after processing
   * @param filePath Path to verify
   * @param operation Description of the operation for error messages
   */
  private async verifyFileExists(
    filePath: string,
    operation: string
  ): Promise<boolean> {
    const exists = await fsPromises
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.error(
        `Failed to verify file exists after ${operation}: ${filePath}`
      );
    }

    return exists;
  }

  /**
   * Bundle TypeScript file to ES2017 JS with all imports inlined
   * @param inputFile Input file path
   * @param outputFile Output file path
   * @param isReact Whether the file is a React component
   */
  async bundleTypeScript(
    inputFile: string,
    outputFile: string,
    isReact = false
  ): Promise<void> {
    try {
      const loader: Record<string, esbuild.Loader> = isReact
        ? { '.tsx': 'tsx', '.ts': 'ts', '.js': 'js' }
        : { '.ts': 'ts', '.js': 'js' };

      // Determine if this is a server-side script
      const isServerScript = this.isServerScript(inputFile);
      const externalPackages = this.getExternalPackages(isServerScript);

      const result = await esbuild.build({
        entryPoints: [inputFile],
        bundle: true,
        outfile: outputFile,
        format: 'iife', // Use IIFE format for FiveM compatibility
        target: 'es2017',
        minify: false,
        sourcemap: 'external',
        loader: loader,
        jsx: isReact ? 'transform' : undefined,
        logLevel: 'info',
        external: externalPackages,
        // Use node platform for server scripts, browser platform for client scripts
        platform: isServerScript ? 'node' : 'browser',
      });

      if (result.errors.length > 0) {
        console.error(`Errors bundling ${inputFile}:`, result.errors);
      } else {
        await this.verifyFileExists(outputFile, 'TypeScript bundling');
      }
    } catch (err) {
      console.error(`Failed to bundle TypeScript file ${inputFile}:`, err);
      throw err;
    }
  }

  /**
   * Bundle JavaScript file with all imports inlined
   * @param inputFile Input file path
   * @param outputFile Output file path
   */
  async bundleJavaScript(inputFile: string, outputFile: string): Promise<void> {
    try {
      // Determine if this is a server-side script
      const isServerScript = this.isServerScript(inputFile);
      const externalPackages = this.getExternalPackages(isServerScript);

      const result = await esbuild.build({
        entryPoints: [inputFile],
        bundle: true,
        outfile: outputFile,
        format: 'iife', // Use IIFE format for FiveM compatibility
        target: 'es2017',
        minify: false,
        sourcemap: 'external',
        external: externalPackages,
        // Use node platform for server scripts, browser platform for client scripts
        platform: isServerScript ? 'node' : 'browser',
      });

      if (result.errors.length > 0) {
        console.error(`Errors bundling ${inputFile}:`, result.errors);
      } else {
        await this.verifyFileExists(outputFile, 'JavaScript bundling');
      }
    } catch (err) {
      console.error(`Failed to bundle JavaScript file ${inputFile}:`, err);
      throw err;
    }
  }

  /**
   * Copy Lua file to output directory
   * @param inputFile Input file path
   * @param outputFile Output file path
   */
  async copyLuaFile(inputFile: string, outputFile: string): Promise<void> {
    try {
      await fsPromises.copyFile(inputFile, outputFile);
      await this.verifyFileExists(outputFile, 'Lua file copying');
    } catch (err) {
      console.error(
        `Error copying Lua file from ${inputFile} to ${outputFile}:`,
        err
      );
      throw err;
    }
  }

  /**
   * Helper function to verify files in the output directory
   * @param dir Directory to verify
   */
  async verifyOutputDir(dir: string): Promise<void> {
    try {
      // Check if directory exists
      const stats = await fsPromises.stat(dir);
      if (!stats.isDirectory()) {
        console.error(`Path exists but is not a directory: ${dir}`);
        return;
      }

      // List all files in the directory
      const files = await fsPromises.readdir(dir, { withFileTypes: true });

      if (files.length === 0) {
        console.log(`Directory is empty: ${dir}`);
        return;
      }

      // Process each entry
      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
          console.log(`  [DIR] ${file.name}`);
        } else {
          // Get file size
          const fileStats = await fsPromises.stat(fullPath);
          console.log(`  [FILE] ${file.name} (${fileStats.size} bytes)`);
        }
      }
    } catch (err) {
      console.error(`Error verifying directory ${dir}:`, err);
    }

    console.log(`--- End verification of ${dir} ---\n`);
  }
}

// Export a singleton instance for backward compatibility
export const bundlerService = new BundlerService();

// Export individual functions for backward compatibility
export const bundleTypeScript =
  bundlerService.bundleTypeScript.bind(bundlerService);
export const bundleJavaScript =
  bundlerService.bundleJavaScript.bind(bundlerService);
export const copyLuaFile = bundlerService.copyLuaFile.bind(bundlerService);
export const verifyOutputDir =
  bundlerService.verifyOutputDir.bind(bundlerService);
