/**
 * Rebuild utilities for handling component rebuilds
 */
import * as path from 'path';
import * as fs from 'fs';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import { ResourceManager } from './ResourceManager.js';
import { findPluginPaths, parsePluginPaths, getProjectPaths, generateManifest, fileSystem } from './index.js';

// Global flag to track if a build is in progress
declare global {
  var isBuilding: boolean;
}

/**
 * Rebuild component wrapper to handle common tasks
 * @param componentType Type of component to rebuild
 * @param pluginDir Optional plugin directory for plugin rebuilds
 */
export async function rebuildComponent(
  componentType: 'plugin' | 'core' | 'webview',
  pluginDir?: string
): Promise<void> {
  console.log(
    `Rebuilding ${componentType}${pluginDir ? `: ${pluginDir}` : ''}`
  );
  global.isBuilding = true;

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
        // For now, just log that we don't have a specific handler
        console.log(
          'Webview rebuild requested, but no specific handler implemented'
        );
        break;
      }
    }

    // Check if we need to generate a webview manifest
    const webviewDir = path.join(distDir, 'webview');
    if (fs.existsSync(webviewDir)) {
      console.log('Generating webview manifest...');
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
    const logger = new ConsoleLogger();
    const resourceManager = new ResourceManager(fileSystem, logger, {
      reloaderEnabled: process.env.RELOADER_ENABLED === 'true',
      reloaderHost: process.env.RELOADER_HOST || 'localhost',
      reloaderPort: parseInt(process.env.RELOADER_PORT || '3414', 10),
      reloaderApiKey: process.env.RELOADER_API_KEY || 'your-secure-api-key',
    });
    await resourceManager.deployResources(distDir);
  } catch (error) {
    console.error(`Error rebuilding ${componentType}:`, error);
  } finally {
    global.isBuilding = false;
  }
}
