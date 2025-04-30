/// <reference types="@citizenfx/client" />

import { config, Delay, QBCore } from './utils';
import { setupCameraForVehicle } from './camera';
import { setWeatherTime } from './weather';

export function getAllVehicleModels(): string[] {
  if (config.useQBVehicles && QBCore != null) {
    if (config.debug) console.log('DEBUG: Using QBCore vehicle list.');
    return Object.keys(QBCore.Shared.Vehicles);
  } else {
    if (config.debug)
      console.log('DEBUG: Using default GetAllVehicleModels().');
    // Note: GetAllVehicleModels native doesn't exist client-side.
    // This needs to be handled differently, perhaps via server-side event or a predefined list if not using QBCore.
    // For now, returning an empty array as a placeholder.
    console.warn(
      'WARN: GetAllVehicleModels() is not available client-side. Provide a vehicle list or use QBCore integration.'
    );
    return []; // Placeholder
  }
}

export function createGreenScreenVehicle(
  vehicleHash: number,
  vehicleModel: string
): Promise<number | null> {
  return new Promise(async (resolve) => {
    if (config.debug)
      console.log(`DEBUG: Spawning Vehicle ${vehicleModel} (${vehicleHash})`);
    const timeout = setTimeout(() => {
      console.error(`ERROR: Timeout spawning vehicle ${vehicleModel}`);
      resolve(null);
    }, config.vehicleSpawnTimeout);

    if (!IsModelValid(vehicleHash)) {
      console.error(
        `ERROR: Invalid vehicle model hash: ${vehicleHash} for model ${vehicleModel}`
      );
      clearTimeout(timeout);
      resolve(null);
      return;
    }

    if (!HasModelLoaded(vehicleHash)) {
      RequestModel(vehicleHash);
      const startTime = GetGameTimer();
      while (!HasModelLoaded(vehicleHash)) {
        await Delay(100);
        if (GetGameTimer() - startTime > config.modelLoadTimeout) {
          // Use a configurable timeout
          console.error(
            `ERROR: Timeout loading model ${vehicleModel} (${vehicleHash})`
          );
          SetModelAsNoLongerNeeded(vehicleHash); // Release the model request
          clearTimeout(timeout);
          resolve(null);
          return;
        }
      }
    }

    const vehicle = CreateVehicle(
      vehicleHash,
      config.greenScreenVehiclePosition.x,
      config.greenScreenVehiclePosition.y,
      config.greenScreenVehiclePosition.z,
      config.greenScreenVehicleRotation.z, // Use Z rotation for heading
      true, // isNetwork
      true // p_116
    );

    if (vehicle === 0) {
      console.error(
        `ERROR: Failed to create vehicle ${vehicleModel} (CreateVehicle returned 0)`
      );
      SetModelAsNoLongerNeeded(vehicleHash);
      clearTimeout(timeout);
      resolve(null);
    } else {
      if (config.debug)
        console.log(
          `DEBUG: Vehicle ${vehicleModel} created with handle ${vehicle}`
        );
      clearTimeout(timeout);
      resolve(vehicle);
    }
  });
}

export async function takeScreenshotForVehicle(
  vehicle: number,
  hash: number,
  model: string
) {
  if (config.debug)
    console.log(`DEBUG: Preparing screenshot for vehicle ${model} (${hash})`);
  setWeatherTime(); // Ensure weather/time are set

  await Delay(200); // Slightly longer delay before camera setup

  await setupCameraForVehicle(vehicle, hash);

  await Delay(100); // Delay after camera setup

  // Track this screenshot request
  exports[GetCurrentResourceName()].trackScreenshotRequest();

  emitNet('takeScreenshot', `${model}`, 'vehicles');
  if (config.debug)
    console.log(`DEBUG: Screenshot request emitted for vehicle ${model}`);

  await Delay(config.screenshotDelay || 2000); // Use configurable delay

  // No need to destroy camera here, it will be handled by the command loop or cleanup
  return;
}

export function cleanupVehicle(vehicle: number, hash: number) {
  if (config.debug)
    console.log(`DEBUG: Cleaning up vehicle ${vehicle} (${hash})`);
  if (DoesEntityExist(vehicle)) {
    DeleteEntity(vehicle);
  }
  if (HasModelLoaded(hash)) {
    SetModelAsNoLongerNeeded(hash);
  }
}
