/// <reference types="@citizenfx/client" />

import { config, Delay } from './utils';

export function SetPedOnGround(ped: number) {
  const [x, y, z] = GetEntityCoords(ped, false);
  const [retval, ground] = GetGroundZFor_3dCoord(x, y, z, false); // Changed 4th argument to boolean false
  SetEntityCoords(ped, x, y, ground, false, false, false, false);
  if (config.debug)
    console.log(`DEBUG: Set ped ${ped} on ground at Z: ${ground}`);
}

export function ClearAllPedProps(ped: number) {
  if (config.debug) console.log(`DEBUG: Clearing all props for ped ${ped}`);
  for (const prop of Object.keys(config.cameraSettings.PROPS)) {
    ClearPedProp(ped, parseInt(prop));
  }
}

export async function ResetPedComponents(ped: number) {
  if (config.debug)
    console.log(`DEBUG: Resetting Ped Components for ped ${ped}`);

  SetPedDefaultComponentVariation(ped);
  await Delay(150); // Allow time for default components to apply

  // Apply a base set of components
  SetPedComponentVariation(ped, 0, 0, 1, 0); // Head (Drawable 0, Texture 1 seems common)
  SetPedComponentVariation(ped, 1, 0, 0, 0); // Mask (Clear mask)
  SetPedComponentVariation(ped, 2, 0, 0, 0); // Hair (Set to a default, e.g., 0)
  SetPedComponentVariation(ped, 7, 0, 0, 0); // Accessories (Clear accessories)
  SetPedComponentVariation(ped, 5, 0, 0, 0); // Bags (Clear bags)
  SetPedComponentVariation(ped, 6, 0, 0, 0); // Shoes (Set to default/barefoot)
  SetPedComponentVariation(ped, 9, 0, 0, 0); // Armor (Clear armor)
  SetPedComponentVariation(ped, 3, 15, 0, 0); // Torso (Set to 15 - common base)
  SetPedComponentVariation(ped, 8, 15, 0, 0); // Undershirt (Set to 15 - common base/none)
  SetPedComponentVariation(ped, 4, 14, 0, 0); // Legs (Set to 14 - common base/shorts)
  SetPedComponentVariation(ped, 11, 15, 0, 0); // Top (Set to 15 - common base/none)

  // Reset hair color (optional, but good for consistency)
  SetPedHairColor(ped, 0, 0); // Black hair, black highlights
  SetPedEyeColor(ped, 0); // Default eye color

  // Reset face features (optional)
  SetPedHeadBlendData(ped, 0, 0, 0, 0, 0, 0, 0, 0, 0, false);
  for (let i = 0; i < GetNumHeadOverlayValues(0); i++) {
    // Corrected native name
    // Use GetNumHeadOverlayValues
    SetPedHeadOverlay(ped, i, 0, 0.0); // Reset overlays
  }
  for (let i = 0; i < 20; i++) {
    // Reset face features
    SetPedFaceFeature(ped, i, 0.0);
  }

  ClearAllPedProps(ped); // Clear props after setting base components

  await Delay(100); // Short delay after reset
  if (config.debug) console.log(`DEBUG: Ped ${ped} components reset.`);
  return;
}

export async function LoadComponentVariation(
  ped: number,
  component: number,
  drawable: number,
  texture?: number
) {
  texture = texture || 0;

  if (config.debug)
    console.log(
      `DEBUG: Loading Component Variation for ped ${ped}: ${component} ${drawable} ${texture}`
    );

  // Preload data - essential for stability
  SetPedPreloadVariationData(ped, component, drawable, texture);
  const startTime = GetGameTimer();
  while (!HasPedPreloadVariationDataFinished(ped)) {
    await Delay(50);
    if (GetGameTimer() - startTime > 5000) {
      // Timeout after 5 seconds
      console.error(
        `ERROR: Timeout loading component variation ${component}-${drawable}-${texture} for ped ${ped}`
      );
      // Potentially try to clear the component or reset ped here
      SetPedComponentVariation(ped, component, -1, -1, -1); // Try clearing
      await Delay(50);
      return false; // Indicate failure
    }
  }

  // Apply the variation
  SetPedComponentVariation(ped, component, drawable, texture, 0); // Palette 0 is standard
  ReleasePedPreloadVariationData(ped); // Corrected native name

  await Delay(50); // Small delay after applying
  return true; // Indicate success
}

export async function LoadPropVariation(
  ped: number,
  component: number,
  prop: number,
  texture?: number
) {
  texture = texture || 0;

  if (config.debug)
    console.log(
      `DEBUG: Loading Prop Variation for ped ${ped}: ${component} ${prop} ${texture}`
    );

  // Preload data
  SetPedPreloadPropData(ped, component, prop, texture);
  const startTime = GetGameTimer();
  while (!HasPedPreloadPropDataFinished(ped)) {
    await Delay(50);
    if (GetGameTimer() - startTime > 5000) {
      // Timeout after 5 seconds
      console.error(
        `ERROR: Timeout loading prop variation ${component}-${prop}-${texture} for ped ${ped}`
      );
      ClearPedProp(ped, component); // Try clearing
      await Delay(50);
      return false; // Indicate failure
    }
  }

  // Apply the variation
  ClearPedProp(ped, component); // Clear existing prop first
  await Delay(10); // Tiny delay after clearing
  SetPedPropIndex(ped, component, prop, texture, true); // Attach prop
  ReleasePedPreloadPropData(ped); // Corrected native name

  await Delay(50); // Small delay after applying
  return true; // Indicate success
}

export function setupPedForScreenshot(ped: number) {
  if (config.debug) console.log(`DEBUG: Setting up ped ${ped} for screenshot.`);
  SetEntityRotation(
    ped,
    config.greenScreenRotation.x,
    config.greenScreenRotation.y,
    config.greenScreenRotation.z,
    0,
    false
  );
  SetEntityCoordsNoOffset(
    ped,
    config.greenScreenPosition.x,
    config.greenScreenPosition.y,
    config.greenScreenPosition.z,
    false,
    false,
    false
  );
  FreezeEntityPosition(ped, true);
}

export function cleanupPedAfterScreenshot(
  ped: number,
  intervalId?: NodeJS.Timeout | null
) {
  if (config.debug)
    console.log(`DEBUG: Cleaning up ped ${ped} after screenshot.`);
  SetPlayerControl(PlayerId(), true, 0); // Changed 3rd argument to number 0
  FreezeEntityPosition(ped, false);
  if (intervalId) {
    clearInterval(intervalId);
  }
  SetPedOnGround(ped); // Ensure ped is grounded after processing
}
