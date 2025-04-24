/**
 * Process utility functions for working with child processes
 */
import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';

// Create a logger for process utilities
const logger = new ConsoleLogger({ minLevel: 0 });

/**
 * Process execution result
 */
export interface ProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Execute a command and return the result
 * @param command Command to execute
 * @param args Command arguments
 * @param options Spawn options
 * @returns Promise that resolves with the process result
 */
export function executeCommand(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    logger.info(`Executing command: ${command} ${args.join(' ')}`);

    const process = spawn(command, args, {
      ...options,
      shell: true,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    if (process.stdout) {
      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        logger.debug(`[stdout] ${chunk.trim()}`);
      });
    }

    if (process.stderr) {
      process.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        logger.debug(`[stderr] ${chunk.trim()}`);
      });
    }

    process.on('close', (code) => {
      if (code === 0) {
        logger.info(`Command completed successfully with exit code ${code}`);
        resolve({ code, stdout, stderr });
      } else {
        logger.warn(`Command failed with exit code ${code}`);
        resolve({ code, stdout, stderr });
      }
    });

    process.on('error', (error) => {
      logger.error(`Command execution error: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Execute a command and stream the output
 * @param command Command to execute
 * @param args Command arguments
 * @param options Spawn options
 * @returns Promise that resolves when the process completes
 */
export function executeCommandWithOutput(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<number | null> {
  return new Promise((resolve, reject) => {
    logger.info(`Executing command with output: ${command} ${args.join(' ')}`);

    const process = spawn(command, args, {
      ...options,
      shell: true,
      stdio: 'inherit',
    });

    process.on('close', (code) => {
      if (code === 0) {
        logger.info(`Command completed successfully with exit code ${code}`);
        resolve(code);
      } else {
        logger.warn(`Command failed with exit code ${code}`);
        resolve(code);
      }
    });

    process.on('error', (error) => {
      logger.error(`Command execution error: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Start a long-running process
 * @param command Command to execute
 * @param args Command arguments
 * @param options Spawn options
 * @returns Child process
 */
export function startProcess(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): ChildProcess {
  logger.info(`Starting process: ${command} ${args.join(' ')}`);

  const process = spawn(command, args, {
    ...options,
    shell: true,
    stdio: 'pipe',
  });

  if (process.stdout) {
    process.stdout.on('data', (data) => {
      const chunk = data.toString();
      logger.debug(`[stdout] ${chunk.trim()}`);
    });
  }

  if (process.stderr) {
    process.stderr.on('data', (data) => {
      const chunk = data.toString();
      logger.debug(`[stderr] ${chunk.trim()}`);
    });
  }

  process.on('close', (code) => {
    logger.info(`Process exited with code ${code}`);
  });

  process.on('error', (error) => {
    logger.error(`Process error: ${error.message}`);
  });

  return process;
}

/**
 * Kill a process
 * @param process Child process to kill
 * @param signal Signal to send
 */
export function killProcess(
  process: ChildProcess,
  signal: NodeJS.Signals = 'SIGTERM'
): void {
  if (process && !process.killed) {
    logger.info(`Killing process with signal ${signal}`);
    process.kill(signal);
  }
}
