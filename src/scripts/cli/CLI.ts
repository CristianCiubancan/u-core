/**
 * Command-line interface
 */
import { Command } from '../core/types.js';
import { BuildCommand } from './commands/BuildCommand.js';
import { DevCommand } from './commands/DevCommand.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { ConsoleLogger, LogLevel } from '../utils/logger/ConsoleLogger.js';

/**
 * Command-line interface
 */
export class CLI {
  private commands: Map<string, Command>;
  private logger: ConsoleLogger;

  /**
   * Create a new CLI
   */
  constructor() {
    this.logger = new ConsoleLogger({ minLevel: LogLevel.Info });
    this.commands = new Map();

    // Register commands
    this.registerCommand(new BuildCommand());
    this.registerCommand(new DevCommand());
    this.registerCommand(new HelpCommand(this.getCommands()));
  }

  /**
   * Register a command
   * @param command Command to register
   */
  private registerCommand(command: Command): void {
    this.commands.set(command.name, command);
  }

  /**
   * Get all registered commands
   * @returns Map of commands
   */
  private getCommands(): Map<string, Command> {
    return this.commands;
  }

  /**
   * Parse command-line arguments
   * @param args Command-line arguments
   * @returns Command and arguments
   */
  private parseArgs(args: string[]): { commandName: string; commandArgs: string[] } {
    // Default command is 'build'
    let commandName = 'build';
    let commandArgs = args;

    // If first argument doesn't start with '-', it's the command name
    if (args.length > 0 && !args[0].startsWith('-')) {
      commandName = args[0];
      commandArgs = args.slice(1);
    }

    return { commandName, commandArgs };
  }

  /**
   * Run the CLI
   * @param args Command-line arguments
   */
  async run(args: string[]): Promise<void> {
    try {
      const { commandName, commandArgs } = this.parseArgs(args);
      const command = this.commands.get(commandName);

      if (!command) {
        this.logger.error(`Unknown command: ${commandName}`);
        this.commands.get('help')?.execute([]);
        return;
      }

      await command.execute(commandArgs);
    } catch (error) {
      this.logger.error('Error running command:', error);
      throw error;
    }
  }
}
