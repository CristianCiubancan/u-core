/**
 * Utility functions for working with command line arguments
 */

/**
 * Command line arguments
 */
export interface CommandLineArgs {
  watch: boolean;
  reload: boolean;
}

/**
 * Parse command line arguments
 */
export function parseArgs(): CommandLineArgs {
  const args = process.argv.slice(2);
  return {
    watch: args.includes('--watch') || args.includes('-w'),
    reload: args.includes('--reload') || args.includes('-r'),
  };
}
