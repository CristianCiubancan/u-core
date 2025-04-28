/// <reference types="@citizenfx/client" />

import { startWeatherResource } from './weather';
import { destroyCamera } from './camera';
import { cleanupPedAfterScreenshot } from './ped'; // Assuming ped state needs cleanup
import { playerId, config } from './utils'; // Import playerId and config

// Keep track of any active intervals or states that need cleanup
let activeInterval: NodeJS.Timeout | null = null; // Updated type to match setInterval return type
let activeScreenshotRequests = 0;

export function setActiveInterval(intervalId: NodeJS.Timeout | null) {
  activeInterval = intervalId;
}

export function initializeEvents() {
  // Handle resource stop event
  on('onResourceStop', (resName: string) => {
    if (GetCurrentResourceName() != resName) return;

    console.log(`INFO: Resource ${resName} stopping. Cleaning up...`);

    // Stop weather sync restoration (if applicable)
    startWeatherResource(); // Ensure weather sync is re-enabled if it was disabled

    // Clear any active intervals
    if (activeInterval) {
      clearInterval(activeInterval);
      activeInterval = null;
      console.log('INFO: Cleared active interval.');
    }

    // Destroy camera
    destroyCamera();

    // Cleanup ped state (assuming PlayerPedId() is the relevant ped)
    const playerPed = PlayerPedId();
    if (playerPed && DoesEntityExist(playerPed)) {
      // Call cleanup function if needed, passing the interval ID if it was managing ped tasks
      // cleanupPedAfterScreenshot(playerPed, activeInterval); // Pass null if interval already cleared
      // Or just ensure control is returned and ped is unfrozen:
      // Attempt to unfreeze the ped, safe even if not frozen
      FreezeEntityPosition(playerPed, false);
      SetPlayerControl(playerId, true, 0); // Ensure player control is restored (added flags argument)
      console.log(
        'INFO: Restored player control and attempted to unfreeze ped.'
      );
    }

    console.log(`INFO: Cleanup for resource ${resName} complete.`);
  });

  // Handle screenshot processed event from server
  onNet('screenshot:processed', (fileName: string) => {
    if (config.debug) {
      console.log(`DEBUG: Screenshot processed: ${fileName}`);
    }

    activeScreenshotRequests--;

    // If this was the last screenshot in a batch, notify the UI
    if (activeScreenshotRequests <= 0) {
      activeScreenshotRequests = 0; // Ensure it doesn't go negative
      SendNUIMessage({
        action: 'end',
        success: true,
        message: 'All screenshots completed!',
      });
    }
  });

  // Handle screenshot error event from server
  onNet('screenshot:error', (errorMessage: string) => {
    console.error(`ERROR: Screenshot processing failed: ${errorMessage}`);

    activeScreenshotRequests--;

    // Even if there's an error, continue with other screenshots if any
    if (activeScreenshotRequests <= 0) {
      activeScreenshotRequests = 0;
      SendNUIMessage({
        action: 'end',
        error: errorMessage || 'Failed to process screenshot',
      });
    }
  });

  // Optional: Handle broadcast events from server (if you decide to use the broadcast mechanism)
  onNet('screenshot:broadcast', (fileName: string, type: string) => {
    if (config.debug) {
      console.log(
        `DEBUG: Received broadcast for screenshot: ${fileName} (type: ${type})`
      );
    }

    // You can decide how to handle broadcast events here
    // For example, you might want to update UI or trigger other actions
    // This is useful when the original client that requested the screenshot is no longer available
  });

  // Set up a periodic check for stale screenshot requests
  // This helps prevent UI from being stuck in "processing" state if server fails to respond
  const checkInterval = setInterval(() => {
    if (activeScreenshotRequests > 0) {
      // If it's been more than 30 seconds since the last screenshot request was made
      // and we still have pending requests, assume they're stale and reset
      const currentTime = Date.now();
      const lastRequestTime =
        global.exports[GetCurrentResourceName()].getLastRequestTime();

      if (lastRequestTime && currentTime - lastRequestTime > 30000) {
        console.warn(
          `WARNING: Detected stale screenshot requests. Resetting counter.`
        );
        activeScreenshotRequests = 0;
        SendNUIMessage({
          action: 'end',
          error: 'Screenshot processing timed out',
        });
      }
    }
  }, 5000); // Check every 5 seconds

  // Store the interval so we can clear it when the resource stops
  setActiveInterval(checkInterval);

  // Track the last time a screenshot request was made
  let lastRequestTime = 0;

  // Export a function to track screenshot requests
  global.exports('trackScreenshotRequest', () => {
    activeScreenshotRequests++;
    lastRequestTime = Date.now();
    if (config.debug) {
      console.log(
        `DEBUG: Tracking new screenshot request. Active requests: ${activeScreenshotRequests}`
      );
    }
  });

  // Export a function to get the last request time
  global.exports('getLastRequestTime', () => {
    return lastRequestTime;
  });
}
