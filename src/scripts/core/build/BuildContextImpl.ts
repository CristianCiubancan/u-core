/**
 * Build context implementation
 */
import { BuildContext, BuildConfig, Logger } from '../types.js';

/**
 * Build context implementation
 */
export class BuildContextImpl implements BuildContext {
  rootDir: string;
  pluginsDir: string;
  coreDir: string;
  distDir: string;
  watch: boolean;
  reload: boolean;
  logger: Logger;
  config: BuildConfig;

  /**
   * Create a new build context
   * @param options Build context options
   */
  constructor(options: BuildContext) {
    this.rootDir = options.rootDir;
    this.pluginsDir = options.pluginsDir;
    this.coreDir = options.coreDir;
    this.distDir = options.distDir;
    this.watch = options.watch;
    this.reload = options.reload;
    this.logger = options.logger;
    this.config = options.config;
  }
}
