/**
 * Rebuild utilities for handling component rebuilds
 */
import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { ConsoleLogger, LogLevel } from '../logger/ConsoleLogger.js';
import { ResourceManager } from './ResourceManager.js';
import { getProjectPaths, fileSystem } from './index.js';
import type { Logger, BuildContext } from '../../core/types.js';

/**
 * Notify the reload server about a rebuilt component
 * @param componentType The type of component that was rebuilt
 * @param pluginDir The plugin directory (if applicable)
 * @param resourceManager The resource manager instance
 * @param logger The logger instance
 */
async function notifyReloadServer(
  componentType: 'plugin' | 'core' | 'webview',
  pluginDir: string | undefined,
  resourceManager: ResourceManager,
  logger: Logger
): Promise<void> {
  try {
    // Get the resource name based on the component type and plugin directory
    let resourceName: string | null = null;
    if (componentType === 'plugin' && pluginDir) {
      // Extract the plugin name from the directory path
      resourceName = path.basename(pluginDir);
    } else if (componentType === 'core') {
      resourceName = 'core';
    } else if (componentType === 'webview') {
      resourceName = 'webview';
    }

    // Restart the resource if we have a valid resource name
    if (resourceName) {
      logger.info(
        `Notifying reload server about rebuilt resource: ${resourceName}`
      );
      await resourceManager.restartResource(resourceName);
    }
  } catch (error) {
    logger.error(
      `Error notifying reload server: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    // Don't rethrow, let the process continue
  }
}

// Global flag to track if a build is in progress
declare global {
  var isBuilding: boolean;
}

/**
 * Context for rebuilding components
 * Extends BuildContext to ensure compatibility with the build pipeline
 */
export type RebuildContext = BuildContext;

/**
 * Check if a plugin has webview content (Page.tsx file)
 * @param pluginDir Plugin directory
 * @returns Whether the plugin has webview content
 */
export async function checkForWebviewContent(
  pluginDir: string
): Promise<boolean> {
  try {
    // Check if the html directory exists
    const htmlDir = path.join(pluginDir, 'html');

    try {
      await fsPromises.access(htmlDir);
    } catch {
      // html directory doesn't exist
      return false;
    }

    // Check if Page.tsx exists
    const pageTsxPath = path.join(htmlDir, 'Page.tsx');

    try {
      await fsPromises.access(pageTsxPath);
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
 * Rebuild component wrapper to handle common tasks
 * @param componentType Type of component to rebuild
 * @param pluginDir Optional plugin directory for plugin rebuilds
 * @param context Optional rebuild context for the pipeline
 */
export async function rebuildComponent(
  componentType: 'plugin' | 'core' | 'webview',
  pluginDir?: string,
  context?: RebuildContext
): Promise<void> {
  // Use provided logger or create a new one
  const logger =
    context?.logger || new ConsoleLogger({ minLevel: LogLevel.Info });

  logger.info(
    `Rebuilding ${componentType}${pluginDir ? `: ${pluginDir}` : ''}`
  );
  global.isBuilding = true;

  try {
    // Create a context if one wasn't provided
    if (!context) {
      const { rootDir, pluginsDir, coreDir, distDir } = getProjectPaths();
      const { BuildContextImpl } = await import(
        '../../core/build/BuildContextImpl.js'
      );
      const config = {
        env: {},
        options: {
          minify: false,
          sourceMaps: true,
          clean: false,
        },
        paths: {
          rootDir,
          pluginsDir,
          coreDir,
          distDir,
          webviewDir: path.join(rootDir, 'src', 'webview'),
        },
        reloader: {
          enabled: process.env.RELOADER_ENABLED === 'true',
          host: process.env.RELOADER_HOST || 'localhost',
          port: parseInt(process.env.RELOADER_PORT || '3414', 10),
          apiKey: process.env.RELOADER_API_KEY || 'your-secure-api-key',
        },
      };

      context = new BuildContextImpl({
        rootDir,
        pluginsDir,
        coreDir,
        distDir,
        watch: false,
        reload: true,
        logger,
        config,
      });
    }

    // Use the pipeline
    await rebuildWithPipeline(componentType, pluginDir, context);
  } catch (error) {
    logger.error(
      `Error in rebuildComponent for ${componentType}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    // Don't rethrow, let the process continue
  } finally {
    global.isBuilding = false;
  }
}

// Function-based pipeline has been removed in favor of the class-based pipeline

/**
 * Rebuild using the pipeline
 */
async function rebuildWithPipeline(
  componentType: 'plugin' | 'core' | 'webview',
  pluginDir: string | undefined,
  context: RebuildContext
): Promise<void> {
  const { logger } = context;

  try {
    // Import the BuildPipelineImpl to create a new pipeline
    const { BuildPipelineImpl } = await import(
      '../../core/build/BuildPipelineImpl.js'
    );

    // Create a new pipeline for the rebuild
    const pipeline = new BuildPipelineImpl();

    // Create a new context for the rebuild
    const rebuildContext = { ...context };

    // Import all the stages
    const { buildCorePluginsStage } = await import(
      '../../core/build/stages/BuildCorePluginsStage.js'
    );
    const { buildPluginsStage } = await import(
      '../../core/build/stages/BuildPluginsStage.js'
    );
    const { buildWebviewStage } = await import(
      '../../core/build/stages/BuildWebviewStage.js'
    );
    const { fixNestedPluginsStage } = await import(
      '../../core/build/stages/FixNestedPluginsStage.js'
    );
    const { deployResourcesStage } = await import(
      '../../core/build/stages/DeployResourcesStage.js'
    );

    // Skip the clean stage for incremental builds

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

    // Notify the reload server about the rebuilt component
    const resourceManager = new ResourceManager(fileSystem, logger, {
      reloaderEnabled: process.env.RELOADER_ENABLED === 'true',
      reloaderHost: process.env.RELOADER_HOST || 'localhost',
      reloaderPort: parseInt(process.env.RELOADER_PORT || '3414', 10),
      reloaderApiKey: process.env.RELOADER_API_KEY || 'your-secure-api-key',
    });

    await notifyReloadServer(componentType, pluginDir, resourceManager, logger);

    logger.info(
      `Rebuild process for ${componentType}${
        pluginDir ? `: ${pluginDir}` : ''
      } completed`
    );
  } catch (error) {
    logger.error(
      `Error in rebuildComponent for ${componentType}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}
