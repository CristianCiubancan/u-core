/**
 * Console logger implementation
 */
import { Logger } from '../../core/types.js';

/**
 * Log levels
 */
export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

/**
 * Console logger options
 */
export interface ConsoleLoggerOptions {
  /** Minimum log level to display */
  minLevel?: LogLevel;
  /** Whether to include timestamps */
  timestamps?: boolean;
  /** Whether to use colors */
  colors?: boolean;
}

/**
 * Console logger implementation
 */
export class ConsoleLogger implements Logger {
  private minLevel: LogLevel;
  private timestamps: boolean;
  private colors: boolean;

  /**
   * Create a new console logger
   * @param options Logger options
   */
  constructor(options: ConsoleLoggerOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevel.Debug;
    this.timestamps = options.timestamps ?? true;
    this.colors = options.colors ?? true;
  }

  /**
   * Format a log message
   * @param level Log level
   * @param message Message to log
   * @param args Additional arguments
   * @returns Formatted message
   */
  private format(level: LogLevel, message: string, args: any[]): string {
    const timestamp = this.timestamps ? `[${new Date().toISOString()}] ` : '';
    const levelStr = LogLevel[level].toUpperCase();
    const levelFormatted = this.formatLevel(level, levelStr);
    
    // Format the message
    let formattedMessage = `${timestamp}${levelFormatted}: ${message}`;
    
    // Add additional arguments if any
    if (args.length > 0) {
      formattedMessage += ' ' + args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' ');
    }
    
    return formattedMessage;
  }

  /**
   * Format a log level
   * @param level Log level
   * @param levelStr String representation of the log level
   * @returns Formatted log level
   */
  private formatLevel(level: LogLevel, levelStr: string): string {
    if (!this.colors) {
      return levelStr;
    }

    // ANSI color codes
    const reset = '\x1b[0m';
    let color = '';

    switch (level) {
      case LogLevel.Debug:
        color = '\x1b[36m'; // Cyan
        break;
      case LogLevel.Info:
        color = '\x1b[32m'; // Green
        break;
      case LogLevel.Warn:
        color = '\x1b[33m'; // Yellow
        break;
      case LogLevel.Error:
        color = '\x1b[31m'; // Red
        break;
    }

    return `${color}${levelStr}${reset}`;
  }

  /**
   * Log a debug message
   * @param message Message to log
   * @param args Additional arguments
   */
  debug(message: string, ...args: any[]): void {
    if (this.minLevel <= LogLevel.Debug) {
      console.debug(this.format(LogLevel.Debug, message, args));
    }
  }

  /**
   * Log an info message
   * @param message Message to log
   * @param args Additional arguments
   */
  info(message: string, ...args: any[]): void {
    if (this.minLevel <= LogLevel.Info) {
      console.info(this.format(LogLevel.Info, message, args));
    }
  }

  /**
   * Log a warning message
   * @param message Message to log
   * @param args Additional arguments
   */
  warn(message: string, ...args: any[]): void {
    if (this.minLevel <= LogLevel.Warn) {
      console.warn(this.format(LogLevel.Warn, message, args));
    }
  }

  /**
   * Log an error message
   * @param message Message to log
   * @param args Additional arguments
   */
  error(message: string, ...args: any[]): void {
    if (this.minLevel <= LogLevel.Error) {
      console.error(this.format(LogLevel.Error, message, args));
    }
  }
}
