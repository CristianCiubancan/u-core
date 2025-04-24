/**
 * Enhanced file system implementation with additional utility methods
 */
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { FileSystem } from '../../core/types.js';

/**
 * File system implementation with enhanced functionality
 */
export class FileSystemImpl implements FileSystem {
  /**
   * Read a file
   * @param filePath Path to the file
   * @param encoding File encoding
   * @returns File content
   */
  async readFile(
    filePath: string,
    encoding: BufferEncoding = 'utf8'
  ): Promise<string> {
    return fsPromises.readFile(filePath, { encoding });
  }

  /**
   * Read a file synchronously
   * @param filePath Path to the file
   * @param encoding File encoding
   * @returns File content
   */
  readFileSync(filePath: string, encoding: BufferEncoding = 'utf8'): string {
    return fs.readFileSync(filePath, { encoding });
  }

  /**
   * Write a file
   * @param filePath Path to the file
   * @param content File content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // Ensure the directory exists
    await this.ensureDir(path.dirname(filePath));
    return fsPromises.writeFile(filePath, content);
  }

  /**
   * Write a file synchronously
   * @param filePath Path to the file
   * @param content File content
   */
  writeFileSync(filePath: string, content: string): void {
    // Ensure the directory exists
    this.ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
  }

  /**
   * Copy a file
   * @param source Source file path
   * @param destination Destination file path
   */
  async copyFile(source: string, destination: string): Promise<void> {
    // Ensure the directory exists
    await this.ensureDir(path.dirname(destination));
    return fsPromises.copyFile(source, destination);
  }

  /**
   * Ensure a directory exists
   * @param dirPath Directory path
   */
  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fsPromises.access(dirPath);
    } catch (error) {
      // Directory doesn't exist, create it
      await fsPromises.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Ensure a directory exists (synchronous version)
   * @param dirPath Directory path
   */
  ensureDirSync(dirPath: string): void {
    try {
      fs.accessSync(dirPath);
    } catch (error) {
      // Directory doesn't exist, create it
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Check if a file exists
   * @param filePath File path
   * @returns Whether the file exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fsPromises.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a file exists (synchronous version)
   * @param filePath File path
   * @returns Whether the file exists
   */
  existsSync(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get files matching a pattern
   * @param pattern Glob pattern
   * @param options Glob options
   * @returns Matching file paths
   */
  async glob(
    pattern: string,
    options: glob.GlobOptions = {}
  ): Promise<string[]> {
    try {
      // Use glob directly
      const matches = await glob.glob(pattern, options);
      // Convert to string[] to satisfy the return type
      return matches.map((match) => match.toString());
    } catch (error) {
      console.error(`Error in glob pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Get files matching a pattern (synchronous version)
   * @param pattern Glob pattern
   * @param options Glob options
   * @returns Matching file paths
   */
  globSync(pattern: string, options: glob.GlobOptions = {}): string[] {
    try {
      const matches = glob.sync(pattern, options);
      // Convert to string[] to satisfy the return type
      return matches.map((match) => match.toString());
    } catch (error) {
      console.error(`Error in glob pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Get all file paths within a directory recursively
   * @param dirPath Directory to scan for files
   * @returns Array of file paths
   */
  getFilePaths(dirPath: string): string[] {
    const filePaths: string[] = [];

    // Helper function to recursively scan directories
    const scanDirectory = (directory: string) => {
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
    };

    // Start scanning from the provided directory path
    scanDirectory(dirPath);
    return filePaths;
  }

  /**
   * Find all paths containing a specific file (e.g., plugin.json)
   * @param dirPath The root directory to search
   * @param targetFileName The filename to search for
   * @returns Array of directory paths containing the target file
   */
  findPathsWithFile(dirPath: string, targetFileName: string): string[] {
    const foundPaths: string[] = [];

    // Helper function to recursively scan directories
    const scanDirectory = (directory: string) => {
      try {
        const items = fs.readdirSync(directory);

        for (const item of items) {
          const itemPath = path.join(directory, item);
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            scanDirectory(itemPath); // Recursively scan subdirectories
          } else if (stats.isFile() && item === targetFileName) {
            // When we find the target file, add its parent directory to foundPaths
            const parentDir = path.dirname(itemPath);
            if (!foundPaths.includes(parentDir)) {
              foundPaths.push(parentDir);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory: ${directory}`, error);
      }
    };

    // Start scanning from the provided directory path
    scanDirectory(dirPath);
    return foundPaths;
  }

  /**
   * Normalize a path for cross-platform consistency
   * @param filePath Path to normalize
   * @returns Normalized path with forward slashes
   */
  normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
  }
}
