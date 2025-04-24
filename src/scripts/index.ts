#!/usr/bin/env node
/**
 * Main entry point for the build system
 */
import 'dotenv/config'; // Load environment variables from .env file
import { CLI } from './cli/CLI.js';

// Check if we're in watch mode
const isWatchMode =
  process.argv.includes('--watch') ||
  process.argv.includes('-w') ||
  process.argv.includes('dev');

// Initialize and run the CLI
const cli = new CLI();
cli
  .run(process.argv.slice(2))
  .then(() => {
    // Only exit if we're not in watch mode
    if (!isWatchMode) {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Error running CLI:', error);
    process.exit(1);
  });
