/// <reference types="@citizenfx/client" />

import { initializeCommands } from './commands';
import { initializeEvents } from './events';
import {
  initializeNewPedCommands,
  forceStopScreenshotProcess,
} from './newPedCommands'; // Import new command initializer AND force stop function
import { config } from './utils'; // Import config to log debug message

console.log('DEBUG: fivem-greenscreener client script loading...'); // Added log

if (config.debug) {
  console.log('DEBUG: fivem-greenscreener client script initializing...');
}

// Initialize event handlers
initializeEvents();

// Initialize command handlers
initializeCommands();
initializeNewPedCommands(); // Initialize new ped commands

if (config.debug) {
  console.log(
    'DEBUG: fivem-greenscreener client script initialized successfully.'
  );
}

// Handle resource stopping to clean up screenshot process
on('onResourceStop', (resourceName: string) => {
  if (GetCurrentResourceName() === resourceName) {
    forceStopScreenshotProcess();
  }
});
