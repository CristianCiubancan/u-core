/**
 * Setup watchers stage
 */
import 'dotenv/config'; // Load environment variables from .env file
import * as path from 'path';
import * as fs from 'fs/promises';
import { BuildContext } from '../../types.js';
import { WatcherManagerImpl, DebouncedTaskManager } from '../WatcherManager.js';
import { ResourceManagerImpl } from '../../resources/ResourceManager.js';

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
    const resourceManager = new ResourceManagerImpl(undefined, logger, {
      reloaderEnabled: config.reloader.enabled,
      reloaderHost: config.reloader.host,
      reloaderPort: config.reloader.port,
      reloaderApiKey: config.reloader.apiKey,
    });

    // Create watcher manager
    const watcherManager = new WatcherManagerImpl(logger, debouncedTaskManager);

    // Store watcher manager in context for later use
    (context as any).watcherManager = watcherManager;

    // Set up plugin watchers
    watcherManager.setupPluginWatchers(
      pluginsDir,
      distDir,
      async (componentType, pluginDir) => {
        // Rebuild the component
        await rebuildComponent(componentType, pluginDir, context);
      }
    );

    // Set up core watcher
    watcherManager.setupCoreWatcher(
      coreDir,
      distDir,
      async (componentType, pluginDir) => {
        // Rebuild the component
        await rebuildComponent(componentType, pluginDir, context);
      }
    );

    // Set up webview watcher
    watcherManager.setupWebviewWatcher(
      pluginsDir,
      distDir,
      async (componentType, pluginDir) => {
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
 * Rebuild a component
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
    switch (componentType) {
      case 'plugin':
        // Rebuild plugin
        if (pluginDir) {
          await rebuildPlugin(pluginDir, context);
        } else {
          logger.error('Cannot rebuild plugin: pluginDir is undefined');
        }
        break;

      case 'core':
        // Rebuild core
        try {
          await rebuildCore(context);
        } catch (coreError: any) {
          logger.error(
            `Error rebuilding core: ${coreError.message || String(coreError)}`
          );
          // Don't rethrow, let the process continue
        }
        break;

      case 'webview':
        // Rebuild webview
        try {
          await rebuildWebview(context);
        } catch (webviewError: any) {
          logger.error(
            `Error rebuilding webview: ${
              webviewError.message || String(webviewError)
            }`
          );
          // Don't rethrow, let the process continue
        }
        break;
    }

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
 * Rebuild a plugin
 * @param pluginDir Plugin directory
 * @param context Build context
 */
async function rebuildPlugin(
  pluginDir: string,
  context: BuildContext
): Promise<void> {
  const { logger } = context;

  logger.info(`Rebuilding plugin: ${pluginDir}`);

  try {
    // Import the build plugins stage
    const { buildPluginsStage } = await import('./BuildPluginsStage.js');

    // Create a new context for the rebuild
    const rebuildContext = { ...context };

    // Override the plugins directory
    rebuildContext.pluginsDir = pluginDir;

    try {
      // Run the build plugins stage
      await buildPluginsStage(rebuildContext);
    } catch (buildError: any) {
      logger.error(
        `Error in build plugins stage for ${pluginDir}: ${
          buildError.message || String(buildError)
        }`
      );
      // Continue with the rest of the process even if this step fails
    }

    // Check if this plugin has a Page.tsx file (webview content)
    let hasWebviewContent = false;
    try {
      hasWebviewContent = await checkForWebviewContent(pluginDir);
    } catch (checkError: any) {
      logger.error(
        `Error checking for webview content in ${pluginDir}: ${
          checkError.message || String(checkError)
        }`
      );
      // Assume it might have webview content if we can't check
      hasWebviewContent = true;
    }

    // If the plugin has webview content, also rebuild the webview
    if (hasWebviewContent) {
      logger.info(`Plugin has webview content, rebuilding webview...`);
      try {
        // Use the rebuildWebview function to ensure all webviews are rebuilt properly
        await rebuildWebview(context);
      } catch (webviewError: any) {
        logger.error(
          `Error rebuilding webview for ${pluginDir}: ${
            webviewError.message || String(webviewError)
          }`
        );
        // Continue with the rest of the process even if this step fails
      }
    }

    try {
      // Run the fix nested plugins stage
      const { fixNestedPluginsStage } = await import(
        './FixNestedPluginsStage.js'
      );
      await fixNestedPluginsStage(context);
    } catch (fixError: any) {
      logger.error(
        `Error fixing nested plugins for ${pluginDir}: ${
          fixError.message || String(fixError)
        }`
      );
      // Continue with the rest of the process even if this step fails
    }

    try {
      // Run the deploy resources stage
      const { deployResourcesStage } = await import(
        './DeployResourcesStage.js'
      );
      await deployResourcesStage(context);
    } catch (deployError: any) {
      logger.error(
        `Error deploying resources for ${pluginDir}: ${
          deployError.message || String(deployError)
        }`
      );
      // This is the last step, so we don't need to continue
    }

    logger.info(`Plugin ${pluginDir} rebuild process completed`);
  } catch (error: any) {
    logger.error(
      `Error rebuilding plugin ${pluginDir}: ${error.message || String(error)}`
    );
    // Don't throw the error, let the process continue
  }
}

/**
 * Rebuild core
 * @param context Build context
 */
async function rebuildCore(context: BuildContext): Promise<void> {
  const { logger } = context;

  logger.info('Rebuilding core');

  try {
    // Import the build core plugins stage
    const { buildCorePluginsStage } = await import(
      './BuildCorePluginsStage.js'
    );

    try {
      // Run the build core plugins stage
      await buildCorePluginsStage(context);
    } catch (buildError: any) {
      logger.error(
        `Error in build core plugins stage: ${
          buildError.message || String(buildError)
        }`
      );
      // Continue with the rest of the process even if this step fails
    }

    try {
      // Run the fix nested plugins stage
      const { fixNestedPluginsStage } = await import(
        './FixNestedPluginsStage.js'
      );
      await fixNestedPluginsStage(context);
    } catch (fixError: any) {
      logger.error(
        `Error fixing nested plugins for core: ${
          fixError.message || String(fixError)
        }`
      );
      // Continue with the rest of the process even if this step fails
    }

    try {
      // Run the deploy resources stage
      const { deployResourcesStage } = await import(
        './DeployResourcesStage.js'
      );
      await deployResourcesStage(context);
    } catch (deployError: any) {
      logger.error(
        `Error deploying resources for core: ${
          deployError.message || String(deployError)
        }`
      );
      // This is the last step, so we don't need to continue
    }

    logger.info('Core rebuild process completed');
  } catch (error: any) {
    logger.error(`Error rebuilding core: ${error.message || String(error)}`);
    // Don't throw the error, let the process continue
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

/**
 * Rebuild webview
 * @param context Build context
 */
async function rebuildWebview(context: BuildContext): Promise<void> {
  const { logger } = context;

  logger.info('Rebuilding webview - starting process');

  try {
    // Import the build webview stage
    const { buildWebviewStage } = await import('./BuildWebviewStage.js');

    // Make sure we have the latest plugin information
    // Import the build plugins stage to get the latest plugin information
    const { buildPluginsStage } = await import('./BuildPluginsStage.js');
    const { buildCorePluginsStage } = await import(
      './BuildCorePluginsStage.js'
    );

    logger.info('Updating plugin information before rebuilding webview');

    // Run the build plugins stages to ensure we have the latest plugin information
    // This won't rebuild the plugins, but will update the context with the latest plugin information
    try {
      logger.info('Updating core plugin information');
      await buildCorePluginsStage(context);
    } catch (coreError: any) {
      logger.error(
        `Error updating core plugin information: ${
          coreError.message || String(coreError)
        }`
      );
      // Continue with the process even if this step fails
    }

    try {
      logger.info('Updating regular plugin information');
      await buildPluginsStage(context);
    } catch (pluginsError: any) {
      logger.error(
        `Error updating regular plugin information: ${
          pluginsError.message || String(pluginsError)
        }`
      );
      // Continue with the process even if this step fails
    }

    // Log the plugins that will be used for the webview build
    const plugins = [
      ...((context as any).plugins || []),
      ...((context as any).corePlugins || []),
    ];

    logger.info(`Found ${plugins.length} total plugins for webview build`);

    // Log plugins with webview content
    const webviewPlugins = plugins.filter((p) => p.hasHtml);
    logger.info(
      `Found ${
        webviewPlugins.length
      } plugins with webview content: ${webviewPlugins
        .map((p) => p.name || p.pathFromPluginsDir)
        .join(', ')}`
    );

    try {
      // Now run the build webview stage with the updated context
      logger.info('Running webview build with Vite');
      await buildWebviewStage(context);
    } catch (webviewError: any) {
      logger.error(
        `Error building webview with Vite: ${
          webviewError.message || String(webviewError)
        }`
      );
      // Continue with the process even if this step fails
    }

    try {
      // Run the fix nested plugins stage
      logger.info('Fixing nested plugins after webview build');
      const { fixNestedPluginsStage } = await import(
        './FixNestedPluginsStage.js'
      );
      await fixNestedPluginsStage(context);
    } catch (fixError: any) {
      logger.error(
        `Error fixing nested plugins after webview build: ${
          fixError.message || String(fixError)
        }`
      );
      // Continue with the process even if this step fails
    }

    try {
      // Run the deploy resources stage
      logger.info('Deploying resources after webview build');
      const { deployResourcesStage } = await import(
        './DeployResourcesStage.js'
      );
      await deployResourcesStage(context);
    } catch (deployError: any) {
      logger.error(
        `Error deploying resources after webview build: ${
          deployError.message || String(deployError)
        }`
      );
      // This is the last step, so we don't need to continue
    }

    logger.info('Webview rebuild process completed');
  } catch (error: any) {
    logger.error(
      `Error in webview rebuild process: ${error.message || String(error)}`
    );
    // Don't throw the error, let the process continue
  }
}
