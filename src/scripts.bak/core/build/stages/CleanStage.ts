/**
 * Clean stage
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { BuildContext } from '../../types.js';

/**
 * Clean the output directory
 * @param context Build context
 */
export async function cleanStage(context: BuildContext): Promise<void> {
  const { distDir, logger, config } = context;
  
  // Skip if clean is disabled
  if (!config.options.clean) {
    logger.info('Skipping clean stage (disabled in config)');
    return;
  }
  
  logger.info(`Cleaning output directory: ${distDir}`);
  
  try {
    // Check if the directory exists
    try {
      await fs.access(distDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(distDir, { recursive: true });
      logger.debug(`Created output directory: ${distDir}`);
      return;
    }
    
    // Read the directory
    const entries = await fs.readdir(distDir, { withFileTypes: true });
    
    // Delete each entry
    for (const entry of entries) {
      const entryPath = path.join(distDir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively delete directory
        await fs.rm(entryPath, { recursive: true, force: true });
      } else {
        // Delete file
        await fs.unlink(entryPath);
      }
      
      logger.debug(`Deleted: ${entryPath}`);
    }
    
    logger.info('Output directory cleaned successfully');
  } catch (error) {
    logger.error('Error cleaning output directory:', error);
    throw error;
  }
}
