// @ts-nocheck
/// <reference types="@citizenfx/client" />

import { startWeatherResource } from './weather';
import { destroyCamera } from './camera';
import { cleanupPedAfterScreenshot } from './ped'; // Assuming ped state needs cleanup
import { playerId } from './utils'; // Import playerId if needed for cleanup

// Keep track of any active intervals or states that need cleanup
let activeInterval: number | null = null; // Example: if commands start intervals

export function setActiveInterval(intervalId: number | null) {
  activeInterval = intervalId;
}

export function initializeEvents() {
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
      if (IsEntityFrozen(playerPed)) {
        FreezeEntityPosition(playerPed, false);
      }
      SetPlayerControl(playerId, true); // Ensure player control is restored
      console.log('INFO: Restored player control and unfroze ped.');
    }

    console.log(`INFO: Cleanup for resource ${resName} complete.`);
  });

  // Add other event listeners here if needed
}
