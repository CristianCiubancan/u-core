/**
 * Deploy resources stage
 */
import { BuildContext } from '../../types.js';
import { ResourceManagerImpl } from '../../resources/ResourceManager.js';

/**
 * Deploy resources
 * @param context Build context
 */
export async function deployResourcesStage(context: BuildContext): Promise<void> {
  const { distDir, logger, config } = context;
  
  logger.info('Deploying resources...');
  
  try {
    // Create resource manager
    const resourceManager = new ResourceManagerImpl(
      undefined,
      logger,
      {
        reloaderEnabled: config.reloader.enabled,
        reloaderHost: config.reloader.host,
        reloaderPort: config.reloader.port,
        reloaderApiKey: config.reloader.apiKey,
      }
    );
    
    // Deploy resources
    await resourceManager.deployResources(distDir);
    
    logger.info('Resources deployed successfully');
  } catch (error) {
    logger.error('Error deploying resources:', error);
    throw error;
  }
}
