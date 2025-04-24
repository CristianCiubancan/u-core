/**
 * Path utility functions for consistent path handling across the codebase
 */
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Project paths
 */
export interface ProjectPaths {
  pluginsDir: string;
  coreDir: string;
  distDir: string;
  rootDir: string;
  webviewDir: string;
}

/**
 * Get paths for the project
 */
export function getProjectPaths(): ProjectPaths {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.join(__dirname, '../../../../');

  return {
    pluginsDir: path.join(rootDir, 'src', 'plugins'),
    coreDir: path.join(rootDir, 'src', 'core'),
    distDir: path.join(rootDir, 'dist'),
    rootDir,
    webviewDir: path.join(rootDir, 'src', 'webview'),
  };
}

/**
 * Normalize a path for cross-platform consistency
 * @param filePath Path to normalize
 * @returns Normalized path with forward slashes
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Get the relative path from one directory to another
 * @param from Source directory
 * @param to Target directory
 * @returns Normalized relative path with forward slashes
 */
export function getRelativePath(from: string, to: string): string {
  return normalizePath(path.relative(from, to));
}

/**
 * Join path segments and normalize the result
 * @param segments Path segments to join
 * @returns Normalized joined path with forward slashes
 */
export function joinPath(...segments: string[]): string {
  return normalizePath(path.join(...segments));
}

/**
 * Get the directory name of a path
 * @param filePath Path to get directory from
 * @returns Normalized directory path with forward slashes
 */
export function getDirName(filePath: string): string {
  return normalizePath(path.dirname(filePath));
}

/**
 * Get the base name of a path
 * @param filePath Path to get base name from
 * @param ext Optional extension to remove
 * @returns Base name of the path
 */
export function getBaseName(filePath: string, ext?: string): string {
  return path.basename(filePath, ext);
}

/**
 * Get the extension of a path
 * @param filePath Path to get extension from
 * @returns Extension of the path (including the dot)
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Check if a path starts with a specific prefix
 * @param filePath Path to check
 * @param prefix Prefix to check for
 * @returns Whether the path starts with the prefix
 */
export function pathStartsWith(filePath: string, prefix: string): boolean {
  const normalizedPath = normalizePath(filePath);
  const normalizedPrefix = normalizePath(prefix);
  return normalizedPath.startsWith(normalizedPrefix);
}

/**
 * Calculate the output path for a file
 * @param file File object with pathFromPluginDir and name properties
 * @param outputDir Output directory
 * @returns Output path with correct extension
 */
export function calculateOutputPath(
  file: { pathFromPluginDir: string; name: string },
  outputDir: string
): { outputPath: string; outputPathWithCorrectExt: string } {
  // Calculate the output path
  const outputPath = joinPath(outputDir, file.pathFromPluginDir);
  
  // Replace .ts and .tsx extensions with .js
  const outputPathWithCorrectExt = outputPath.replace(/\.(ts|tsx)$/, '.js');
  
  return { outputPath, outputPathWithCorrectExt };
}

/**
 * Determine the category of a file based on its path
 * @param filePath Path to check
 * @returns Category of the file (client, server, shared, translations, or null)
 */
export function getFileCategory(
  filePath: string
): 'client' | 'server' | 'shared' | 'translations' | null {
  // Normalize the path to ensure consistent separators
  const normalizedPath = normalizePath(filePath);
  
  // Check if the path starts with any of the category prefixes
  if (normalizedPath.startsWith('client/')) {
    return 'client';
  } else if (normalizedPath.startsWith('server/')) {
    return 'server';
  } else if (normalizedPath.startsWith('shared/')) {
    return 'shared';
  } else if (normalizedPath.startsWith('translations/')) {
    return 'translations';
  }
  
  return null;
}
