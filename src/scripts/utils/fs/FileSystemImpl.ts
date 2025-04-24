/**
 * File system implementation
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as glob from 'glob';
import { FileSystem } from '../../core/types.js';

/**
 * File system implementation
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
    return fs.readFile(filePath, { encoding });
  }

  /**
   * Write a file
   * @param filePath Path to the file
   * @param content File content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    // Ensure the directory exists
    await this.ensureDir(path.dirname(filePath));
    return fs.writeFile(filePath, content);
  }

  /**
   * Copy a file
   * @param source Source file path
   * @param destination Destination file path
   */
  async copyFile(source: string, destination: string): Promise<void> {
    // Ensure the directory exists
    await this.ensureDir(path.dirname(destination));
    return fs.copyFile(source, destination);
  }

  /**
   * Ensure a directory exists
   * @param dirPath Directory path
   */
  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Check if a file exists
   * @param filePath File path
   * @returns Whether the file exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
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
}
