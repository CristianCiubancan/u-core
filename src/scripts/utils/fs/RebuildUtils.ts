/**
 * Rebuild utilities for handling component rebuilds
 */
import * as path from 'path';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { ConsoleLogger, LogLevel } from '../logger/ConsoleLogger.js';
import { ResourceManager } from './ResourceManager.js';
import {
  findPluginPaths,
  parsePluginPaths,
  getProjectPaths,
  generateManifest,
  fileSystem,
} from './index.js';
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
 * @param context Optional rebuild context for class-based pipeline
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
    // If context is provided, use the class-based pipeline
    if (context) {
      await rebuildWithClassPipeline(componentType, pluginDir, context);
    } else {
      // Otherwise use the function-based pipeline
      await rebuildWithFunctionPipeline(componentType, pluginDir, logger);
    }
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

/**
 * Rebuild using the function-based pipeline
 */
async function rebuildWithFunctionPipeline(
  componentType: 'plugin' | 'core' | 'webview',
  pluginDir: string | undefined,
  logger: Logger
): Promise<void> {
  try {
    const { coreDir, distDir } = getProjectPaths();

    // Import the builder functions dynamically to avoid circular dependencies
    const { buildAndGenerateManifests } = await import('../builder.js');

    switch (componentType) {
      case 'plugin': {
        if (!pluginDir) throw new Error('Plugin directory is required');
        const pluginPaths = findPluginPaths(path.dirname(pluginDir));
        const plugins = parsePluginPaths(
          pluginPaths.filter((p: string) => p === pluginDir)
        );
        await buildAndGenerateManifests(plugins, distDir);
        break;
      }
      case 'core': {
        const pluginPaths = findPluginPaths(coreDir);
        const corePlugins = parsePluginPaths(pluginPaths);
        await buildAndGenerateManifests(corePlugins, distDir);
        break;
      }
      case 'webview': {
        // If we need to rebuild webview assets, we would handle that here
        logger.info(
          'Webview rebuild requested, but no specific handler implemented'
        );
        break;
      }
    }

    // Check if we need to generate a webview manifest
    const webviewDir = path.join(distDir, 'webview');
    if (fs.existsSync(webviewDir)) {
      logger.info('Generating webview manifest...');
      generateManifest(
        {
          name: 'webview',
          version: '0.1.0',
          fx_version: 'cerulean',
          author: 'Baloony Gaze',
          games: ['gta5', 'rdr3'],
          description: 'Shared webview assets',
          files: ['index.html', 'assets/**/*'],
        },
        path.join(webviewDir, 'fxmanifest.lua')
      );
    }

    // Deploy built resources
    const resourceManager = new ResourceManager(fileSystem, logger, {
      reloaderEnabled: process.env.RELOADER_ENABLED === 'true',
      reloaderHost: process.env.RELOADER_HOST || 'localhost',
      reloaderPort: parseInt(process.env.RELOADER_PORT || '3414', 10),
      reloaderApiKey: process.env.RELOADER_API_KEY || 'your-secure-api-key',
    });
    await resourceManager.deployResources(distDir);

    // Notify the reload server about the rebuilt component
    await notifyReloadServer(componentType, pluginDir, resourceManager, logger);

    logger.info(
      `Rebuild process for ${componentType}${
        pluginDir ? `: ${pluginDir}` : ''
      } completed`
    );
  } catch (error) {
    logger.error(`Error rebuilding ${componentType}:`, error);
    throw error;
  }
}

/**
 * Rebuild using the class-based pipeline
 */
async function rebuildWithClassPipeline(
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
