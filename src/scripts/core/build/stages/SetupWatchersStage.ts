/**
 * Setup watchers stage
 */
import 'dotenv/config'; // Load environment variables from .env file
import * as path from 'path';
import * as fs from 'fs/promises';
import { BuildContext } from '../../types.js';
import {
  WatcherManager,
  DebouncedTaskManager,
  ResourceManager,
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
        // Rebuild the component
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
        // Rebuild the component
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
        // Rebuild the component
        await rebuildComponent(componentType, pluginDir, context);
      }
    );

    logger.info('Watchers set up successfully');
  } catch (error) {
    logger.error('Error setting up watchers:', error);
    throw error;
  }
}

/**
 * Rebuild a component using the build pipeline
 * @param componentType Component type
 * @param pluginDir Plugin directory
 * @param context Build context
 */
async function rebuildComponent(
  componentType: 'plugin' | 'core' | 'webview',
  pluginDir: string | undefined,
  context: BuildContext
): Promise<void> {
  const { logger } = context;

  logger.info(
    `Rebuilding ${componentType}${pluginDir ? `: ${pluginDir}` : ''}`
  );

  try {
    // Import the BuildPipelineImpl to create a new pipeline
    const { BuildPipelineImpl } = await import('../BuildPipelineImpl.js');

    // Create a new pipeline for the rebuild
    const pipeline = new BuildPipelineImpl();

    // Create a new context for the rebuild
    const rebuildContext = { ...context };

    // Import all the stages
    // const { cleanStage } = await import('./CleanStage.js'); // Uncomment if needed
    const { buildCorePluginsStage } = await import(
      './BuildCorePluginsStage.js'
    );
    const { buildPluginsStage } = await import('./BuildPluginsStage.js');
    const { buildWebviewStage } = await import('./BuildWebviewStage.js');
    const { fixNestedPluginsStage } = await import(
      './FixNestedPluginsStage.js'
    );
    const { deployResourcesStage } = await import('./DeployResourcesStage.js');

    // Skip the clean stage for incremental builds
    // pipeline.addStage('clean', cleanStage);

    switch (componentType) {
      case 'plugin':
        if (!pluginDir) {
          logger.error('Cannot rebuild plugin: pluginDir is undefined');
          return;
        }

        // Override the plugins directory to only build the changed plugin
        rebuildContext.pluginsDir = path.dirname(pluginDir);

        // Add the buildPlugins stage
        pipeline.addStage('buildPlugins', buildPluginsStage);

        // Check if this plugin has webview content
        const hasWebviewContent = await checkForWebviewContent(pluginDir);
        if (hasWebviewContent) {
          // Add the buildWebview stage if the plugin has webview content
          pipeline.addStage('buildWebview', buildWebviewStage);
        }

        break;

      case 'core':
        // Add the buildCorePlugins stage
        pipeline.addStage('buildCorePlugins', buildCorePluginsStage);
        break;

      case 'webview':
        // For webview changes, we need to rebuild all plugins first to ensure
        // we have the latest plugin information
        pipeline.addStage('buildCorePlugins', buildCorePluginsStage);
        pipeline.addStage('buildPlugins', buildPluginsStage);
        pipeline.addStage('buildWebview', buildWebviewStage);
        break;
    }

    // Always add these final stages
    pipeline.addStage('fixNestedPlugins', fixNestedPluginsStage);
    pipeline.addStage('deployResources', deployResourcesStage);

    // Run the pipeline
    await pipeline.run(rebuildContext);

    logger.info(
      `Rebuild process for ${componentType}${
        pluginDir ? `: ${pluginDir}` : ''
      } completed`
    );
  } catch (error: any) {
    logger.error(
      `Error in rebuildComponent for ${componentType}: ${
        error.message || String(error)
      }`
    );
    // Don't rethrow, let the process continue
  }
}

/**
 * Check if a plugin has webview content (Page.tsx file)
 * @param pluginDir Plugin directory
 * @returns Whether the plugin has webview content
 */
async function checkForWebviewContent(pluginDir: string): Promise<boolean> {
  try {
    // Check if the html directory exists
    const htmlDir = path.join(pluginDir, 'html');

    try {
      await fs.access(htmlDir);
    } catch {
      // html directory doesn't exist
      return false;
    }

    // Check if Page.tsx exists
    const pageTsxPath = path.join(htmlDir, 'Page.tsx');

    try {
      await fs.access(pageTsxPath);
      return true;
    } catch {
      // Page.tsx doesn't exist
      return false;
    }
  } catch (error) {
    console.error(`Error checking for webview content in ${pluginDir}:`, error);
    return false;
  }
}
