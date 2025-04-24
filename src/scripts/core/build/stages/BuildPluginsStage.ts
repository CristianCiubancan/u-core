/**
 * Build plugins stage
 */
import { BuildContext, Plugin } from '../../types.js';
import { PluginManager } from '../../plugins/PluginManager.js';
import { FileProcessor } from '../FileProcessor.js';
import { ManifestGeneratorImpl } from '../ManifestGenerator.js';

/**
 * Build plugins
 * @param context Build context
 */
export async function buildPluginsStage(context: BuildContext): Promise<void> {
  const { pluginsDir, distDir, logger } = context;

  logger.info('Building plugins...');

  try {
    // Create plugin manager
    const pluginManager = new PluginManager(undefined, logger);

    // Get plugin paths
    const { pluginPaths } = await pluginManager.getPluginPaths(pluginsDir);

    // Parse plugin paths into plugins
    const plugins = await pluginManager.parsePluginPaths(pluginPaths);

    // Store plugins in context for later stages
    (context as any).plugins = plugins;

    // Build each plugin
    await buildPlugins(plugins, distDir, logger);

    logger.info('Plugins built successfully');
  } catch (error) {
    logger.error('Error building plugins:', error);
    throw error;
  }
}

/**
 * Build plugins
 * @param plugins Plugins to build
 * @param distDir Distribution directory
 * @param logger Logger
 */
async function buildPlugins(
  plugins: Plugin[],
  distDir: string,
  logger: any
): Promise<void> {
  // Create file processor
  const fileProcessor = new FileProcessor(undefined, logger);

  // Create manifest generator
  const manifestGenerator = new ManifestGeneratorImpl(undefined, logger);

  // Build each plugin
  for (const plugin of plugins) {
    try {
      logger.info(`Building plugin: ${plugin.name}`);

      // Get plugin output info
      const pluginManager = new PluginManager(undefined, logger);
      const { outputDir, manifestPath } = pluginManager.getPluginOutputInfo(
        plugin,
        distDir
      );

      // Read plugin.json
      const jsonPath = plugin.files.find((f) => f.isPluginJsonFile)?.fullPath;

      if (!jsonPath) {
        logger.warn(
          `Plugin ${plugin.name} does not have a plugin.json file, skipping`
        );
        continue;
      }

      const pluginJsonData = await pluginManager.readPluginJson(jsonPath);

      // If plugin.json data is null, skip this plugin
      if (pluginJsonData === null) {
        logger.warn(
          `Plugin ${plugin.name} has an invalid or missing plugin.json file, skipping`
        );
        continue;
      }

      // Process all files
      const processPromises = plugin.files.map((file) =>
        fileProcessor.processFile(file, outputDir)
      );
      const processedFiles = await Promise.all(processPromises);

      // Categorize generated files
      const generatedFiles =
        fileProcessor.categorizeGeneratedFiles(processedFiles);

      // Prepare plugin manifest data
      const updatedPluginJson = manifestGenerator.preparePluginManifestData(
        pluginJsonData,
        generatedFiles,
        { client: [], server: [], shared: [] } // TODO: Implement script files
      );

      // Generate manifest
      await manifestGenerator.generate(updatedPluginJson, manifestPath);

      logger.info(`Plugin ${plugin.name} built successfully`);
    } catch (error) {
      logger.error(`Error building plugin ${plugin.name}:`, error);
      // Continue with other plugins
    }
  }
}
