// @ts-nocheck
/// <reference types="@citizenfx/client" />

import { initializeCommands } from './commands';
import { initializeEvents } from './events';
import { config } from './utils'; // Import config to log debug message

if (config.debug) {
  console.log('DEBUG: fivem-greenscreener client script initializing...');
}

// Initialize event handlers
initializeEvents();

// Initialize command handlers
initializeCommands();

if (config.debug) {
  console.log(
    'DEBUG: fivem-greenscreener client script initialized successfully.'
  );
}
