/**
 * Dev command
 */
import { Command } from '../../core/types.js';
import { ConsoleLogger } from '../../utils/logger/ConsoleLogger.js';

/**
 * Dev command
 */
export class DevCommand implements Command {
  name = 'dev';
  description = 'Start development mode with watch and reload';
  private logger: ConsoleLogger;

  /**
   * Create a new dev command
   */
  constructor() {
    this.logger = new ConsoleLogger();
  }

  /**
   * Execute the command
   * @param args Command arguments
   */
  async execute(args: string[]): Promise<void> {
    // The dev command is just a shortcut for build --watch --reload
    const buildCommand = new (await import('./BuildCommand.js')).BuildCommand();
    await buildCommand.execute(['--watch', '--reload', ...args]);
  }
}
