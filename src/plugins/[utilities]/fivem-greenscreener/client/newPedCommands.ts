/// <reference types="@citizenfx/client" />

// Import necessary functions and variables - these will need to be adjusted based on actual file structure/exports
import variationsData from './variations.json'; // Import the variations data
import { destroyCamera, setupCameraForComponent } from './camera';
import { setActiveInterval } from './events';
import {
  cleanupPedAfterScreenshot,
  LoadComponentVariation,
  LoadPropVariation,
  ResetPedComponents,
  setupPedForScreenshot,
  ResetAllComponentsToDefault,
} from './ped';
import { config, Delay, playerId } from './utils'; // Removed SendNUIMessage import
import {
  startWeatherResource,
  stopWeatherResource,
  setWeatherTime,
} from './weather';

let currentPed: number | null = null;
let taskInterval: NodeJS.Timeout | null = null;
let isScreenshotProcessRunning = false; // Flag to track if the process is active

// Helper function to take screenshot for components/props (Copied from pedCommands.ts)
async function takeScreenshotForPedItem(
  pedType: string,
  type: 'CLOTHING' | 'PROPS',
  component: number,
  itemId: number, // drawable or prop id
  texture?: number | null,
  cameraSettingsOverride?: any
) {
  const cameraInfo = cameraSettingsOverride
    ? cameraSettingsOverride
    : config.cameraSettings[type]?.[component];

  if (!cameraInfo) {
    console.error(
      `ERROR: Missing camera settings for ${type} component ${component}`
    );
    return;
  }

  // Ensure weather/time are set
  setWeatherTime();
  await Delay(config.delayAfterWeatherSet || 50);

  // Setup camera specifically for this component/prop view
  await setupCameraForComponent(currentPed, cameraInfo);
  await Delay(config.delayAfterCameraSetup || 50);

  // Emit screenshot request
  const textureSuffix =
    texture !== null && texture !== undefined ? `_${texture}` : '';
  const filename = `${pedType}_${
    type === 'PROPS' ? 'prop_' : ''
  }${component}_${itemId}${textureSuffix}`;

  // Track this screenshot request (Assuming this export exists on the resource)
  exports[GetCurrentResourceName()]?.trackScreenshotRequest();

  // *** This is the crucial part that likely relies on a server-side listener ***
  emitNet('takeScreenshot', filename, 'clothing'); // Category might need adjustment

  if (config.debug)
    console.log(`DEBUG: Screenshot request emitted for ${filename}`);

  await Delay(config.screenshotDelay || 500); // Use configurable delay
}

// Main function to initialize the new command
export function initializeNewPedCommands() {
  RegisterCommand(
    'newscreenshot', // *** Renamed command ***
    async (source: number, args: string[]) => {
      // Parse optional arguments
      const itemsPerPositionArg = args[0] ? parseInt(args[0]) : undefined;
      const variationsPerItemArg = args[1] ? parseInt(args[1]) : undefined;

      // Use provided value or null (process all) if invalid/missing
      const itemsPerPosition =
        itemsPerPositionArg !== undefined && !isNaN(itemsPerPositionArg)
          ? itemsPerPositionArg
          : null;
      const variationsPerItem =
        variationsPerItemArg !== undefined && !isNaN(variationsPerItemArg)
          ? variationsPerItemArg
          : null;

      if (config.debug) {
        console.log(
          `DEBUG: /newscreenshot called with itemsPerPosition=${itemsPerPosition}, variationsPerItem=${variationsPerItem}`
        );
      }

      if (isScreenshotProcessRunning) {
        console.log('ERROR: Screenshot process is already running.');
        // Optionally send a chat message back to the user
        return;
      }
      isScreenshotProcessRunning = true; // Set flag to true

      const modelHashes = [
        GetHashKey('mp_m_freemode_01'),
        GetHashKey('mp_f_freemode_01'),
      ];

      SendNUIMessage({ action: 'start', command: 'newscreenshot' }); // Indicate start, specify command
      if (!stopWeatherResource()) return;
      DisableIdleCamera(true);
      await Delay(config.delayAfterIdleCamDisable || 100);

      try {
        for (const modelHash of modelHashes) {
          if (!isScreenshotProcessRunning) break; // Check before processing model
          if (!IsModelValid(modelHash)) continue;

          if (!HasModelLoaded(modelHash)) {
            RequestModel(modelHash);
            const loadStart = GetGameTimer();
            while (!HasModelLoaded(modelHash)) {
              if (!isScreenshotProcessRunning) break; // Check during model load wait
              await Delay(config.delayModelLoadCheck || 100);
              if (GetGameTimer() - loadStart > config.modelLoadTimeout) {
                console.error(
                  `ERROR: Timeout loading player model ${modelHash}`
                );
                throw new Error('Model load timeout');
              }
            }
          }

          SetPlayerModel(playerId, modelHash);
          await Delay(config.delayAfterModelSet || 250);

          currentPed = PlayerPedId();
          const pedType =
            modelHash === GetHashKey('mp_m_freemode_01') ? 'male' : 'female';

          setupPedForScreenshot(currentPed);
          SetPlayerControl(playerId, false, 0);

          // Start interval to clear tasks
          // Using a more reasonable interval to reduce performance impact (10ms instead of 1ms)
          taskInterval = setInterval(() => {
            if (currentPed) ClearPedTasksImmediately(currentPed);
          }, 10); // Increased from 1ms to 10ms to be less demanding but still responsive
          setActiveInterval(taskInterval);

          await ResetPedComponents(currentPed);
          await Delay(config.delayAfterPedReset || 150);

          // Get variations for the current ped type
          const pedVariations = (variationsData as any)[pedType];
          if (!pedVariations) {
            console.error(
              `ERROR: No variations found for ped type: ${pedType}`
            );
            continue; // Skip this model if no variations defined
          }

          // Iterate through CLOTHING defined in variations.json
          if (pedVariations.CLOTHING) {
            for (const stringComponent of Object.keys(pedVariations.CLOTHING)) {
              if (!isScreenshotProcessRunning) break; // Check before processing component
              const component = parseInt(stringComponent);
              const componentVariations = pedVariations.CLOTHING[component];
              const componentName =
                config.cameraSettings.CLOTHING?.[component]?.name ||
                `Comp ${component}`; // Still use config for name/camera

              // Check if camera settings exist for this component from variations
              const cameraInfo = config.cameraSettings.CLOTHING?.[component];
              if (!cameraInfo) {
                console.warn(
                  `WARN: Missing camera settings in config for CLOTHING component ${component} found in variations.json. Skipping.`
                );
                continue;
              }

              // Use Object.keys to get drawables and calculate max for progress
              const drawables = Object.keys(componentVariations);
              // Limit drawables if itemsPerPosition is set
              const drawableLimit =
                itemsPerPosition !== null
                  ? Math.min(drawables.length, itemsPerPosition)
                  : drawables.length;
              let currentDrawableIndex = 0;

              for (let i = 0; i < drawableLimit; i++) {
                const stringDrawable = drawables[i];
                if (!isScreenshotProcessRunning) break; // Check before processing drawable
                const drawable = parseInt(stringDrawable);
                const textureCount = componentVariations[stringDrawable];
                currentDrawableIndex++;

                // Send NUI progress update
                SendNUIMessage({
                  action: 'progressUpdate',
                  data: {
                    command: 'newscreenshot',
                    type: componentName,
                    value: currentDrawableIndex, // Use index for progress
                    max: drawableLimit, // Use limited count of drawables
                  },
                });

                // --- Screenshot Base (Texture 0) ---
                if (textureCount > 0) {
                  if (
                    !(await LoadComponentVariation(
                      currentPed,
                      component,
                      drawable,
                      0
                    ))
                  ) {
                    console.warn(
                      `Failed to load base texture 0 for CLOTHING ${component}-${drawable}. Skipping.`
                    );
                    continue; // Skip this drawable if base fails to load
                  }
                  await takeScreenshotForPedItem(
                    pedType,
                    'CLOTHING',
                    component,
                    drawable,
                    0,
                    cameraInfo
                  ); // Pass cameraInfo, texture 0
                } else {
                  console.warn(
                    `WARN: Drawable ${drawable} for component ${component} has 0 textures listed in variations.json. Skipping base screenshot.`
                  );
                  continue; // Skip this drawable if no textures listed
                }

                // --- Screenshot Texture Variations (if enabled and available) ---
                if (config.debug)
                  console.log(
                    `DEBUG CLOTHING [${component}-${drawable}]: Checking texture variations. includeTextures=${config.includeTextures}, textureCount=${textureCount}`
                  );
                if (config.includeTextures && textureCount > 1) {
                  // Only loop if more than texture 0 exists
                  // Limit textures if variationsPerItem is set
                  const textureLimit =
                    variationsPerItem !== null
                      ? Math.min(textureCount, variationsPerItem)
                      : textureCount;
                  // Start loop from 1, up to textureLimit
                  for (let texture = 1; texture < textureLimit; texture++) {
                    if (config.debug)
                      console.log(
                        `DEBUG CLOTHING [${component}-${drawable}]: Entering texture loop for texture ${texture}`
                      );
                    if (!isScreenshotProcessRunning) break; // Check before processing texture
                    if (
                      !(await LoadComponentVariation(
                        currentPed,
                        component,
                        drawable,
                        texture
                      ))
                    ) {
                      console.warn(
                        `Failed to load texture ${texture} for CLOTHING ${component}-${drawable}. Skipping.`
                      );
                      continue; // Skip this specific texture if loading fails
                    }
                    if (config.debug)
                      console.log(
                        `DEBUG CLOTHING [${component}-${drawable}]: Taking screenshot for texture ${texture}`
                      );
                    await takeScreenshotForPedItem(
                      pedType,
                      'CLOTHING',
                      component,
                      drawable,
                      texture,
                      cameraInfo
                    ); // Pass cameraInfo
                  }
                }
                // --- End Texture Variations ---
              } // End drawable loop

              // Reset ALL components after completing a component group
              await ResetAllComponentsToDefault(currentPed);
              await Delay(config.delayAfterComponentReset || 100);
            }
          }

          // Iterate through PROPS defined in variations.json
          if (pedVariations.PROPS) {
            for (const stringComponent of Object.keys(pedVariations.PROPS)) {
              if (!isScreenshotProcessRunning) break; // Check before processing component
              const component = parseInt(stringComponent);
              const componentVariations = pedVariations.PROPS[component];
              const componentName =
                config.cameraSettings.PROPS?.[component]?.name ||
                `Prop ${component}`; // Still use config for name/camera

              // Check if camera settings exist for this component from variations
              const cameraInfo = config.cameraSettings.PROPS?.[component];
              if (!cameraInfo) {
                console.warn(
                  `WARN: Missing camera settings in config for PROPS component ${component} found in variations.json. Skipping.`
                );
                continue;
              }

              // Use Object.keys to get props and calculate max for progress
              const props = Object.keys(componentVariations);
              // Limit props if itemsPerPosition is set (adjusting for the -1 "none" case)
              const propLimit =
                itemsPerPosition !== null
                  ? Math.min(props.length, itemsPerPosition)
                  : props.length;
              let currentPropIndex = 0;

              for (let i = 0; i < propLimit; i++) {
                const stringProp = props[i];
                if (!isScreenshotProcessRunning) break; // Check before processing prop
                const prop = parseInt(stringProp);
                const textureCount = componentVariations[stringProp];
                currentPropIndex++;

                // Send NUI progress update
                SendNUIMessage({
                  action: 'progressUpdate',
                  data: {
                    command: 'newscreenshot',
                    type: componentName,
                    value: currentPropIndex, // Use index for progress
                    max: propLimit, // Use limited count of props
                  },
                });

                if (prop === -1) {
                  ClearPedProp(currentPed, component);
                  await Delay(config.delayAfterPropClear || 50);
                  // Optional: Screenshot "none" state if desired and configured
                  // We assume variations.json lists -1 if "none" should be screenshotted.
                  // If prop -1 exists in variations.json, textureCount should be 0.
                  if (textureCount === 0) {
                    // Take screenshot for "none" if it's in variations.json
                    // await takeScreenshotForPedItem(pedType, 'PROPS', component, -1, null, cameraInfo);
                  }
                  continue;
                }

                // --- Screenshot Base Prop (Texture 0) ---
                if (textureCount > 0) {
                  if (
                    !(await LoadPropVariation(currentPed, component, prop, 0))
                  ) {
                    console.warn(
                      `Failed to load base texture 0 for PROP ${component}-${prop}. Skipping.`
                    );
                    continue; // Skip if base fails to load
                  }
                  await takeScreenshotForPedItem(
                    pedType,
                    'PROPS',
                    component,
                    prop,
                    0,
                    cameraInfo
                  ); // Pass cameraInfo, texture 0
                } else {
                  console.warn(
                    `WARN: Prop ${prop} for component ${component} has 0 textures listed in variations.json. Skipping base screenshot.`
                  );
                  continue; // Skip this prop if no textures listed
                }

                // --- Screenshot Prop Texture Variations (if enabled and available) ---
                if (config.debug)
                  console.log(
                    `DEBUG PROP [${component}-${prop}]: Checking texture variations. includeTextures=${config.includeTextures}, textureCount=${textureCount}`
                  );
                if (config.includeTextures && textureCount > 1) {
                  // Only loop if more than texture 0 exists
                  // Limit textures if variationsPerItem is set
                  const textureLimit =
                    variationsPerItem !== null
                      ? Math.min(textureCount, variationsPerItem)
                      : textureCount;
                  // Start loop from 1, up to textureLimit
                  for (let texture = 1; texture < textureLimit; texture++) {
                    if (config.debug)
                      console.log(
                        `DEBUG PROP [${component}-${prop}]: Entering texture loop for texture ${texture}`
                      );
                    if (!isScreenshotProcessRunning) break; // Check before processing prop texture
                    if (
                      !(await LoadPropVariation(
                        currentPed,
                        component,
                        prop,
                        texture
                      ))
                    ) {
                      console.warn(
                        `Failed to load texture ${texture} for PROP ${component}-${prop}. Skipping.`
                      );
                      continue; // Skip this specific texture if loading fails
                    }
                    if (config.debug)
                      console.log(
                        `DEBUG PROP [${component}-${prop}]: Taking screenshot for texture ${texture}`
                      );
                    await takeScreenshotForPedItem(
                      pedType,
                      'PROPS',
                      component,
                      prop,
                      texture,
                      cameraInfo
                    ); // Pass cameraInfo
                  }
                }
                // --- End Prop Texture Variations ---
              } // End prop loop
              ClearPedProp(currentPed, component);
              await Delay(config.delayAfterPropClear || 50);
            }
          }

          // Cleanup after processing a model
          cleanupPedAfterScreenshot(currentPed, taskInterval);
          taskInterval = null;
          setActiveInterval(null);
          currentPed = null;
          SetModelAsNoLongerNeeded(modelHash);
        }
      } catch (error: any) {
        // Added type annotation for error
        console.error('ERROR in /newscreenshot command:', error);
        if (taskInterval) clearInterval(taskInterval);
        setActiveInterval(null);
        if (currentPed) cleanupPedAfterScreenshot(currentPed); // Pass interval if available? Check cleanup function
        currentPed = null;
        destroyCamera();
        startWeatherResource();
        DisableIdleCamera(false);
        SendNUIMessage({
          action: 'end',
          command: 'newscreenshot',
          error: error.message || 'An unknown error occurred.',
        });
        isScreenshotProcessRunning = false; // Ensure flag is reset on error
        return;
      }

      // Final cleanup after all models
      destroyCamera();
      startWeatherResource();
      DisableIdleCamera(false);
      SendNUIMessage({ action: 'end', command: 'newscreenshot' });
      console.log('New screenshot command finished successfully.');
      isScreenshotProcessRunning = false; // Reset flag on successful completion
    },
    false // Restricted: false (adjust if needed)
  );

  RegisterCommand(
    'stopscreenshot',
    (source: number, args: string[]) => {
      if (!isScreenshotProcessRunning) {
        console.log('INFO: Screenshot process is not running.');
        // Optionally send chat message
        return;
      }
      console.log('INFO: Stopping screenshot process...');
      isScreenshotProcessRunning = false; // Set flag to false to stop loops
      // Cleanup will happen naturally when the loops in /newscreenshot break
      // Optionally send chat message confirming stop
    },
    false // Restricted: false (adjust if needed)
  );

  // Note: We might need a separate 'customnewscreenshot' command later if that functionality is also desired.
  // For now, focusing on the main screenshot loop.
}

// Placeholder console log to confirm file load during development
console.log('newPedCommands.ts loaded, contains initializeNewPedCommands');
// Initialization should be called from index.ts

// Function to force stop and cleanup the process, e.g., on resource stop
export function forceStopScreenshotProcess() {
  if (!isScreenshotProcessRunning) {
    return; // Nothing to stop
  }
  console.log(
    'INFO: Force stopping screenshot process due to resource stop...'
  );
  isScreenshotProcessRunning = false; // Set flag

  // Perform immediate cleanup
  if (taskInterval) {
    clearInterval(taskInterval);
    setActiveInterval(null); // Assuming setActiveInterval is accessible or handled globally
    taskInterval = null;
  }
  if (currentPed) {
    // Need to ensure cleanupPedAfterScreenshot doesn't rely on async delays here
    try {
      cleanupPedAfterScreenshot(currentPed, null); // Pass null for interval as it's cleared
    } catch (error) {
      console.error('Error during forced ped cleanup:', error);
    }
    currentPed = null;
  }
  destroyCamera();
  startWeatherResource(); // Restore weather
  DisableIdleCamera(false); // Restore idle camera

  // Send NUI message if possible, though it might not be received if UI is closing
  SendNUIMessage({
    action: 'end',
    command: 'newscreenshot',
    error: 'Process stopped by resource unload.',
  });

  console.log('INFO: Screenshot process force stopped and cleaned up.');
}
