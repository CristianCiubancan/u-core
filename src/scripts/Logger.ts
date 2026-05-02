import * as esbuild from 'esbuild';

/**
 * Severity levels in increasing order of urgency. Lower-priority levels are
 * dropped when the configured level is higher.
 */
export type LogLevel = 'verbose' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  verbose: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Level-aware logger injected into the build managers. Replaces ad-hoc
 * `console.*` and per-manager `log()` methods so that:
 *   1. `--log-level` actually filters output (previously every manager had
 *      its own logLevel and only some honored it),
 *   2. errors carry a structured `cause` chain through `error.cause` rather
 *      than collapsed string interpolation, and
 *   3. esbuild errors render via `esbuild.formatMessages` instead of being
 *      stringified ad-hoc.
 */
export interface Logger {
  verbose(message: string): void;
  info(message: string): void;
  warn(message: string, error?: unknown): void;
  error(message: string, error?: unknown): void;
  formatEsbuildErrors(messages: esbuild.Message[]): Promise<string[]>;
}

export interface LoggerOptions {
  level?: LogLevel;
  /** Optional per-component prefix, e.g. `[BuildManager]`. */
  prefix?: string;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const minPriority = LEVEL_PRIORITY[options.level ?? 'info'];
  const componentPrefix = options.prefix ? ` [${options.prefix}]` : '';

  function timestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  function emit(level: LogLevel, label: string, message: string, err?: unknown): void {
    if (LEVEL_PRIORITY[level] < minPriority) return;
    const head = `[${timestamp()}] [${label}]${componentPrefix} ${message}`;
    if (level === 'error') {
      console.error(head);
    } else if (level === 'warn') {
      console.warn(head);
    } else {
      console.log(head);
    }
    if (err !== undefined && err !== null) {
      const detail =
        err instanceof Error ? err.stack ?? err.message : String(err);
      if (level === 'error') {
        console.error(detail);
      } else {
        console.warn(detail);
      }
      // Preserve and surface the error.cause chain so wrapped errors don't
      // hide their root.
      const cause = err instanceof Error ? (err as Error & { cause?: unknown }).cause : undefined;
      if (cause !== undefined && cause !== null) {
        const causeDetail =
          cause instanceof Error ? cause.stack ?? cause.message : String(cause);
        console.error(`  Caused by: ${causeDetail}`);
      }
    }
  }

  return {
    verbose: (msg) => emit('verbose', 'VERBOSE', msg),
    info: (msg) => emit('info', 'INFO', msg),
    warn: (msg, err) => emit('warn', 'WARN', msg, err),
    error: (msg, err) => emit('error', 'ERROR', msg, err),
    async formatEsbuildErrors(messages) {
      if (messages.length === 0) return [];
      return esbuild.formatMessages(messages, {
        kind: 'error',
        color: true,
        terminalWidth: 80,
      });
    },
  };
}
