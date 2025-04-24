#!/usr/bin/env node
/**
 * Main entry point for the build system
 */
import 'dotenv/config'; // Load environment variables from .env file
import { CLI } from './cli/CLI.js';

// Initialize and run the CLI
const cli = new CLI();
cli
  .run(process.argv.slice(2))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running CLI:', error);
    process.exit(1);
  });
