// @ts-nocheck
/// <reference types="@citizenfx/client" />

import { config, Delay } from './utils';
import { setupCameraForObject, destroyCamera } from './camera';
import { setWeatherTime } from './weather';

export async function createGreenScreenObject(
  modelHash: number
): Promise<number | null> {
  return new Promise(async (resolve) => {
    if (config.debug) console.log(`DEBUG: Spawning Object ${modelHash}`);

    if (!IsModelValid(modelHash)) {
      console.error(`ERROR: Invalid object model hash: ${modelHash}`);
      resolve(null);
      return;
    }

    if (!HasModelLoaded(modelHash)) {
      RequestModel(modelHash);
      const startTime = GetGameTimer();
      while (!HasModelLoaded(modelHash)) {
        await Delay(100);
        if (GetGameTimer() - startTime > config.modelLoadTimeout) {
          // Use configurable timeout
          console.error(`ERROR: Timeout loading model ${modelHash}`);
          SetModelAsNoLongerNeeded(modelHash);
          resolve(null);
          return;
        }
      }
    }

    const object = CreateObjectNoOffset(
      modelHash,
      config.greenScreenPosition.x,
      config.greenScreenPosition.y,
      config.greenScreenPosition.z,
      false, // isNetworked (usually false for temp objects)
      true, // thisScriptCheck
      true // dynamic
    );

    if (object === 0) {
      console.error(
        `ERROR: Failed to create object ${modelHash} (CreateObjectNoOffset returned 0)`
      );
      SetModelAsNoLongerNeeded(modelHash);
      resolve(null);
    } else {
      if (config.debug)
        console.log(`DEBUG: Object ${modelHash} created with handle ${object}`);
      SetEntityRotation(
        object,
        config.greenScreenRotation.x,
        config.greenScreenRotation.y,
        config.greenScreenRotation.z,
        0, // Rotation order
        false // p8
      );
      FreezeEntityPosition(object, true);
      await Delay(50); // Allow object to settle
      resolve(object);
    }
  });
}

export async function takeScreenshotForObject(object: number, hash: number) {
  if (config.debug)
    console.log(`DEBUG: Preparing screenshot for object ${hash}`);
  setWeatherTime(); // Ensure weather/time are set

  await Delay(200); // Delay before camera setup

  await setupCameraForObject(object, hash);

  await Delay(100); // Delay after camera setup

  emitNet('takeScreenshot', `${hash}`, 'objects');
  if (config.debug)
    console.log(`DEBUG: Screenshot request emitted for object ${hash}`);

  await Delay(config.screenshotDelay || 2000); // Use configurable delay

  // Camera cleanup handled by the command loop
  return;
}

export function cleanupObject(object: number, hash: number) {
  if (config.debug)
    console.log(`DEBUG: Cleaning up object ${object} (${hash})`);
  if (DoesEntityExist(object)) {
    DeleteEntity(object);
  }
  if (HasModelLoaded(hash)) {
    SetModelAsNoLongerNeeded(hash);
  }
}

export function getObjectModelHash(input: string | number): number | null {
  let modelHash: number;
  if (isNaN(Number(input))) {
    modelHash = GetHashKey(input as string);
  } else {
    modelHash = Number(input);
  }

  // Check if it's a weapon hash and get the corresponding object model
  if (IsWeaponValid(modelHash)) {
    const weaponModel = GetWeapontypeModel(modelHash);
    if (weaponModel !== 0 && weaponModel !== GetHashKey('prop_dummy_weapon')) {
      // Check if a valid model exists
      if (config.debug)
        console.log(
          `DEBUG: Input ${input} is a weapon, using model hash ${weaponModel}`
        );
      return weaponModel;
    } else {
      console.warn(
        `WARN: Could not get a valid model for weapon hash ${modelHash}. Trying input as object hash.`
      );
      // Fall through to treat input as a potential object hash
    }
  }

  // Validate if the resulting hash (or original input if not a weapon) is a valid object model
  if (IsModelValid(modelHash) && IsModelAnObject(modelHash)) {
    if (config.debug)
      console.log(
        `DEBUG: Using object model hash ${modelHash} for input ${input}`
      );
    return modelHash;
  } else {
    console.error(
      `ERROR: Invalid or non-object model hash derived from input: ${input} -> ${modelHash}`
    );
    return null;
  }
}
