/**
 * Setup watchers stage
 */
import 'dotenv/config'; // Load environment variables from .env file
import { BuildContext } from '../../types.js';
import {
  WatcherManager,
  DebouncedTaskManager,
  ResourceManager,
  rebuildComponent,
} from '../../../utils/fs/index.js';

/**
 * Setup watchers
 * @param context Build context
 */
export async function setupWatchersStage(context: BuildContext): Promise<void> {
  const { pluginsDir, coreDir, distDir, watch, logger, config } = context;

  // Skip if watch is disabled
  if (!watch) {
    logger.info('Skipping watcher setup (watch mode disabled)');
    return;
  }

  logger.info('Setting up watchers...');

  try {
    // Create debounced task manager
    const debouncedTaskManager = new DebouncedTaskManager();

    // Create resource manager
    const resourceManager = new ResourceManager(undefined, logger, {
      reloaderEnabled: config.reloader.enabled,
      reloaderHost: config.reloader.host,
      reloaderPort: config.reloader.port,
      reloaderApiKey: config.reloader.apiKey,
    });

    // Create watcher manager
    const watcherManager = new WatcherManager(
      debouncedTaskManager,
      resourceManager,
      logger
    );

    // Store watcher manager in context for later use
    (context as any).watcherManager = watcherManager;

    // Set up plugin watchers
    watcherManager.setupPluginWatchers(
      pluginsDir,
      distDir,
      async (
        componentType: 'plugin' | 'core' | 'webview',
        pluginDir?: string
      ) => {
        // Rebuild the component using the consolidated function
        await rebuildComponent(componentType, pluginDir, context);
      }
    );

    // Set up core watcher
    watcherManager.setupCoreWatcher(
      coreDir,
      distDir,
      async (
        componentType: 'plugin' | 'core' | 'webview',
        pluginDir?: string
      ) => {
        // Rebuild the component using the consolidated function
        await rebuildComponent(componentType, pluginDir, context);
      }
    );

    // Set up webview watcher
    watcherManager.setupWebviewWatcher(
      pluginsDir,
      distDir,
      async (
        componentType: 'plugin' | 'core' | 'webview',
        pluginDir?: string
      ) => {
        // Rebuild the component using the consolidated function
        await rebuildComponent(componentType, pluginDir, context);
      }
    );

    logger.info('Watchers set up successfully');
  } catch (error) {
    logger.error('Error setting up watchers:', error);
    throw error;
  }
}

// The rebuildComponent function has been moved to src/scripts/utils/fs/RebuildUtils.ts
