/**
 * Deploy resources stage
 */
import { ResourceManager } from '../../../utils/fs/ResourceManager.js';
import { BuildContext } from '../../types.js';

/**
 * Deploy resources
 * @param context Build context
 */
export async function deployResourcesStage(
  context: BuildContext
): Promise<void> {
  const { distDir, logger, config } = context;

  logger.info('Deploying resources...');

  try {
    // Create resource manager
    const resourceManager = new ResourceManager(undefined, logger, {
      reloaderEnabled: config.reloader.enabled,
      reloaderHost: config.reloader.host,
      reloaderPort: config.reloader.port,
      reloaderApiKey: config.reloader.apiKey,
    });

    // Deploy resources
    await resourceManager.deployResources(distDir);

    logger.info('Resources deployed successfully');

    // Note: Resource reloading is now handled in RebuildUtils.ts before the "Rebuild process completed" log
  } catch (error) {
    logger.error('Error deploying resources:', error);
    throw error;
  }
}
