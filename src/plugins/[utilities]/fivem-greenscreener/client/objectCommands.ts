/// <reference types="@citizenfx/client" />

import { destroyCamera } from './camera';
import {
  cleanupObject,
  createGreenScreenObject,
  getObjectModelHash,
  takeScreenshotForObject,
} from './object';
import { config, Delay, playerId } from './utils';
import { startWeatherResource, stopWeatherResource } from './weather';

export function initializeObjectCommands() {
  RegisterCommand(
    'screenshotobject',
    async (_source: number, args: string[]) => {
      if (args.length < 1) {
        console.log('Usage: /screenshotobject <object_hash_or_name>');
        return;
      }
      const objectInput = args[0];
      const modelHash = getObjectModelHash(objectInput);

      if (modelHash === null) {
        console.log(
          `ERROR: Could not resolve a valid object model hash for input: ${objectInput}`
        );
        return;
      }

      SendNUIMessage({ action: 'start' }); // Use start/end for single object too
      if (!stopWeatherResource()) return;
      DisableIdleCamera(true);

      // Hide player ped
      const playerPed = PlayerPedId();
      SetEntityCoords(
        playerPed,
        config.greenScreenHiddenSpot.x,
        config.greenScreenHiddenSpot.y,
        config.greenScreenHiddenSpot.z,
        false,
        false,
        false,
        false
      );
      SetPlayerControl(playerId, false, 0); // Added flags argument
      await Delay(100);

      let objectHandle: number | null = null;
      let errorOccurred = false; // Declare errorOccurred here
      try {
        objectHandle = await createGreenScreenObject(modelHash);

        if (objectHandle === null) {
          throw new Error(`Failed to create object ${objectInput}`);
        }

        await takeScreenshotForObject(objectHandle, modelHash);
      } catch (error) {
        console.error('ERROR in /screenshotobject command:', error);
        SendNUIMessage({
          action: 'end',
          error: error.message || 'Failed to process object.',
        });
        errorOccurred = true; // Set errorOccurred in catch block
      } finally {
        // Cleanup
        if (objectHandle !== null) {
          cleanupObject(objectHandle, modelHash);
        }
        destroyCamera();
        startWeatherResource();
        SetPlayerControl(playerId, true, 0); // Restore player control (added flags argument)
        DisableIdleCamera(false);
        if (!errorOccurred) SendNUIMessage({ action: 'end' }); // Corrected variable name
        console.log('Screenshot object command finished.');
      }
    },
    false
  );
}
