/**
 * Build pipeline implementation
 */
import { BuildPipeline, BuildContext } from '../types.js';

/**
 * Build stage
 */
interface BuildStage {
  /** Name of the stage */
  name: string;
  /** Handler function for the stage */
  handler: (context: BuildContext) => Promise<void>;
}

/**
 * Build pipeline implementation
 */
export class BuildPipelineImpl implements BuildPipeline {
  private stages: BuildStage[] = [];

  /**
   * Add a stage to the pipeline
   * @param name Name of the stage
   * @param handler Handler function for the stage
   * @returns This pipeline instance for chaining
   */
  addStage(name: string, handler: (context: BuildContext) => Promise<void>): BuildPipeline {
    this.stages.push({ name, handler });
    return this;
  }

  /**
   * Run the pipeline
   * @param context Build context
   */
  async run(context: BuildContext): Promise<void> {
    context.logger.info('Starting build pipeline...');

    // Run each stage in sequence
    for (const stage of this.stages) {
      context.logger.info(`Running stage: ${stage.name}`);
      
      try {
        await stage.handler(context);
        context.logger.info(`Stage completed: ${stage.name}`);
      } catch (error) {
        context.logger.error(`Error in stage ${stage.name}:`, error);
        throw error;
      }
    }

    context.logger.info('Build pipeline completed successfully!');
  }
}
