/**
 * Build command
 */
import 'dotenv/config'; // Load environment variables from .env file
import { Command } from '../../core/types.js';
import { ConsoleLogger } from '../../utils/logger/ConsoleLogger.js';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import { BuildPipelineImpl } from '../../core/build/BuildPipelineImpl.js';
import { BuildContextImpl } from '../../core/build/BuildContextImpl.js';
import { cleanStage } from '../../core/build/stages/CleanStage.js';
import { buildCorePluginsStage } from '../../core/build/stages/BuildCorePluginsStage.js';
import { buildPluginsStage } from '../../core/build/stages/BuildPluginsStage.js';
import { buildWebviewStage } from '../../core/build/stages/BuildWebviewStage.js';
import { fixNestedPluginsStage } from '../../core/build/stages/FixNestedPluginsStage.js';
import { deployResourcesStage } from '../../core/build/stages/DeployResourcesStage.js';
import { setupWatchersStage } from '../../core/build/stages/SetupWatchersStage.js';

/**
 * Build command
 */
export class BuildCommand implements Command {
  name = 'build';
  description = 'Build the project';
  private logger: ConsoleLogger;

  /**
   * Create a new build command
   */
  constructor() {
    this.logger = new ConsoleLogger();
  }

  /**
   * Parse command arguments
   * @param args Command arguments
   * @returns Parsed options
   */
  private parseArgs(args: string[]): { watch: boolean; reload: boolean } {
    const options = {
      watch: false,
      reload: false,
    };

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--watch' || arg === '-w') {
        options.watch = true;
      } else if (arg === '--reload' || arg === '-r') {
        options.reload = true;
      }
    }

    return options;
  }

  /**
   * Execute the command
   * @param args Command arguments
   */
  async execute(args: string[]): Promise<void> {
    try {
      // Parse arguments
      const { watch, reload } = this.parseArgs(args);

      // Load configuration
      const config = ConfigLoader.load({
        reloader: {
          enabled: reload,
          host: 'localhost',
          port: 30120,
          apiKey: '',
        },
      });

      // Create build context
      const context = new BuildContextImpl({
        rootDir: config.paths.rootDir,
        pluginsDir: config.paths.pluginsDir,
        coreDir: config.paths.coreDir,
        distDir: config.paths.distDir,
        watch,
        reload,
        logger: this.logger,
        config,
      });

      // Create build pipeline
      const pipeline = new BuildPipelineImpl();

      // Add build stages
      pipeline
        .addStage('clean', cleanStage)
        .addStage('buildCorePlugins', buildCorePluginsStage)
        .addStage('buildPlugins', buildPluginsStage)
        .addStage('buildWebview', buildWebviewStage)
        .addStage('fixNestedPlugins', fixNestedPluginsStage)
        .addStage('deployResources', deployResourcesStage);

      // Add watcher stage if in watch mode
      if (watch) {
        pipeline.addStage('setupWatchers', setupWatchersStage);
      }

      // Run the pipeline
      await pipeline.run(context);

      this.logger.info('Build completed successfully!');
    } catch (error) {
      this.logger.error('Build failed:', error);
      throw error;
    }
  }
}
