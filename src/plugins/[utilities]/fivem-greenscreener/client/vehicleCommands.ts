/// <reference types="@citizenfx/client" />

import { destroyCamera } from './camera';
import { config, Delay, playerId, QBCore } from './utils';
import {
  cleanupVehicle,
  createGreenScreenVehicle,
  getAllVehicleModels,
  takeScreenshotForVehicle,
} from './vehicle';
import { startWeatherResource, stopWeatherResource } from './weather';

export function initializeVehicleCommands() {
  RegisterCommand(
    'screenshotvehicle',
    async (_source: number, args: string[]) => {
      if (args.length < 1) {
        console.log(
          "Usage: /screenshotvehicle <model_name/'all'> [primary_color] [secondary_color]"
        );
        return;
      }
      const type = args[0].toLowerCase();
      const primaryColor = args[1] ? parseInt(args[1]) : null;
      const secondaryColor = args[2] ? parseInt(args[2]) : null;

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

      // Clear area
      ClearAreaOfVehicles(
        config.greenScreenVehiclePosition.x,
        config.greenScreenVehiclePosition.y,
        config.greenScreenVehiclePosition.z,
        15.0,
        false,
        false,
        false,
        false,
        false
      );
      await Delay(200);

      let vehiclesToProcess: string[] = [];
      if (type === 'all') {
        vehiclesToProcess = getAllVehicleModels();
        if (
          vehiclesToProcess.length === 0 &&
          !(config.useQBVehicles && QBCore != null)
        ) {
          console.error(
            'ERROR: Could not get vehicle list. Ensure QBCore integration is enabled or provide a manual list.'
          );
          // Cleanup and return
          startWeatherResource();
          SetPlayerControl(playerId, true, 0); // Added flags argument
          DisableIdleCamera(false);
          return;
        }
        SendNUIMessage({ action: 'start' });
      } else {
        vehiclesToProcess = [type]; // Process single vehicle
        SendNUIMessage({ action: 'start' }); // Also show start/end for single
      }

      let errorOccurred = false;
      try {
        for (const [index, vehicleModel] of vehiclesToProcess.entries()) {
          const vehicleHash = GetHashKey(vehicleModel);

          if (!IsModelValid(vehicleHash) || !IsModelAVehicle(vehicleHash)) {
            console.warn(
              `WARN: Skipping invalid vehicle model: ${vehicleModel}`
            );
            continue;
          }

          const vehicleClass = GetVehicleClass(vehicleHash); // Use native if available
          if (!config.includedVehicleClasses[vehicleClass]) {
            if (config.debug)
              console.log(
                `DEBUG: Skipping vehicle ${vehicleModel} due to excluded class ${vehicleClass}`
              );
            continue;
          }

          if (type === 'all') {
            SendNUIMessage({
              action: 'progressUpdate',
              data: {
                type: vehicleModel,
                value: index + 1,
                max: vehiclesToProcess.length,
              },
            });
          } else {
            SendNUIMessage({
              action: 'progressUpdate',
              data: { type: vehicleModel, value: 1, max: 1 },
            });
          }

          let vehicleHandle: number | null = null;
          try {
            vehicleHandle = await createGreenScreenVehicle(
              vehicleHash,
              vehicleModel
            );

            if (vehicleHandle === null) {
              console.error(
                `ERROR: Failed to spawn vehicle: ${vehicleModel}. Skipping.`
              );
              continue; // Skip to next vehicle
            }

            // Apply colors and tint
            SetVehicleWindowTint(vehicleHandle, 1); // Example tint
            if (primaryColor !== null) {
              SetVehicleColours(
                vehicleHandle,
                primaryColor,
                secondaryColor ?? primaryColor
              );
            }
            SetVehicleDirtLevel(vehicleHandle, 0.0); // Clean the vehicle

            await Delay(100); // Allow settings to apply

            await takeScreenshotForVehicle(
              vehicleHandle,
              vehicleHash,
              vehicleModel
            );
          } catch (vehicleError) {
            console.error(
              `ERROR processing vehicle ${vehicleModel}:`,
              vehicleError
            );
            // Don't set errorOccurred = true here, just log and continue if possible
          } finally {
            if (vehicleHandle !== null) {
              cleanupVehicle(vehicleHandle, vehicleHash);
            }
            await Delay(100); // Delay between vehicles
          }
        }
      } catch (mainError) {
        console.error('ERROR in /screenshotvehicle command loop:', mainError);
        errorOccurred = true; // Mark error for final message
      } finally {
        // Final cleanup
        destroyCamera();
        startWeatherResource();
        SetPlayerControl(playerId, true, 0); // Added flags argument
        DisableIdleCamera(false);
        SendNUIMessage({
          action: 'end',
          error: errorOccurred
            ? 'An error occurred during processing.'
            : undefined,
        });
        console.log('Screenshot vehicle command finished.');
      }
    },
    false
  );
}
