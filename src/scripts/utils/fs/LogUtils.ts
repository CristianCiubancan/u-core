/**
 * Logging utility functions for consistent logging across the codebase
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamp?: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  prefix: '',
  timestamp: true,
};

/**
 * Current logger configuration
 */
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 * @param config Logger configuration
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get the current logger configuration
 * @returns Current logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...currentConfig };
}

/**
 * Format a log message
 * @param level Log level
 * @param message Message to log
 * @param args Additional arguments
 * @returns Formatted log message
 */
function formatLogMessage(level: LogLevel, message: string, ...args: any[]): string {
  let formattedMessage = '';
  
  // Add timestamp if enabled
  if (currentConfig.timestamp) {
    formattedMessage += `[${new Date().toISOString()}] `;
  }
  
  // Add prefix if set
  if (currentConfig.prefix) {
    formattedMessage += `[${currentConfig.prefix}] `;
  }
  
  // Add level prefix
  switch (level) {
    case LogLevel.DEBUG:
      formattedMessage += '[DEBUG] ';
      break;
    case LogLevel.INFO:
      formattedMessage += '[INFO] ';
      break;
    case LogLevel.WARN:
      formattedMessage += '[WARN] ';
      break;
    case LogLevel.ERROR:
      formattedMessage += '[ERROR] ';
      break;
  }
  
  // Add message
  formattedMessage += message;
  
  // Add additional arguments if any
  if (args.length > 0) {
    formattedMessage += ' ' + args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return arg.toString();
        }
      }
      return arg;
    }).join(' ');
  }
  
  return formattedMessage;
}

/**
 * Log a debug message
 * @param message Message to log
 * @param args Additional arguments
 */
export function debug(message: string, ...args: any[]): void {
  if (currentConfig.level <= LogLevel.DEBUG) {
    console.log(formatLogMessage(LogLevel.DEBUG, message, ...args));
  }
}

/**
 * Log an info message
 * @param message Message to log
 * @param args Additional arguments
 */
export function info(message: string, ...args: any[]): void {
  if (currentConfig.level <= LogLevel.INFO) {
    console.log(formatLogMessage(LogLevel.INFO, message, ...args));
  }
}

/**
 * Log a warning message
 * @param message Message to log
 * @param args Additional arguments
 */
export function warn(message: string, ...args: any[]): void {
  if (currentConfig.level <= LogLevel.WARN) {
    console.warn(formatLogMessage(LogLevel.WARN, message, ...args));
  }
}

/**
 * Log an error message
 * @param message Message to log
 * @param args Additional arguments
 */
export function error(message: string, ...args: any[]): void {
  if (currentConfig.level <= LogLevel.ERROR) {
    console.error(formatLogMessage(LogLevel.ERROR, message, ...args));
  }
}

/**
 * Create a logger with a specific prefix
 * @param prefix Logger prefix
 * @returns Logger object
 */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, ...args: any[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = prefix;
      debug(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
    info: (message: string, ...args: any[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = prefix;
      info(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
    warn: (message: string, ...args: any[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = prefix;
      warn(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
    error: (message: string, ...args: any[]) => {
      const savedPrefix = currentConfig.prefix;
      currentConfig.prefix = prefix;
      error(message, ...args);
      currentConfig.prefix = savedPrefix;
    },
  };
}
