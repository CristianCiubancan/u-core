/**
 * Help command
 */
import { Command } from '../../core/types.js';
import { ConsoleLogger } from '../../utils/logger/ConsoleLogger.js';

/**
 * Help command
 */
export class HelpCommand implements Command {
  name = 'help';
  description = 'Show help information';
  private commands: Map<string, Command>;
  private logger: ConsoleLogger;

  /**
   * Create a new help command
   * @param commands Map of available commands
   */
  constructor(commands: Map<string, Command>) {
    this.commands = commands;
    this.logger = new ConsoleLogger();
  }

  /**
   * Execute the command
   * @param args Command arguments
   */
  async execute(args: string[]): Promise<void> {
    this.logger.info('Available commands:');
    
    // Sort commands by name
    const sortedCommands = Array.from(this.commands.values())
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Display each command
    for (const command of sortedCommands) {
      this.logger.info(`  ${command.name.padEnd(15)} ${command.description}`);
    }
    
    this.logger.info('\nUsage: pnpm tsx src/scripts/index.ts [command] [options]');
    this.logger.info('For more information about a command, run: pnpm tsx src/scripts/index.ts help [command]');
  }
}
