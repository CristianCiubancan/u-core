/// <reference types="@citizenfx/client" />

// Import necessary functions and variables - these will need to be adjusted based on actual file structure/exports
import { destroyCamera, setupCameraForComponent } from './camera';
import { setActiveInterval } from './events';
import {
  cleanupPedAfterScreenshot,
  LoadComponentVariation,
  LoadPropVariation,
  ResetPedComponents,
  setupPedForScreenshot,
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

          // Iterate through CLOTHING and PROPS defined in config
          for (const type of Object.keys(config.cameraSettings) as Array<
            'CLOTHING' | 'PROPS'
          >) {
            if (!isScreenshotProcessRunning) break; // Check before processing type
            if (type !== 'CLOTHING' && type !== 'PROPS') continue;

            for (const stringComponent of Object.keys(
              config.cameraSettings[type]
            )) {
              if (!isScreenshotProcessRunning) break; // Check before processing component
              const component = parseInt(stringComponent);
              const componentName =
                config.cameraSettings[type]?.[component]?.name ||
                `Comp ${component}`;

              if (type === 'CLOTHING') {
                const drawableVariationCount = GetNumberOfPedDrawableVariations(
                  currentPed,
                  component
                );
                // Limit drawables if itemsPerPosition is set
                const drawableLimit =
                  itemsPerPosition !== null
                    ? Math.min(drawableVariationCount, itemsPerPosition)
                    : drawableVariationCount;

                for (let drawable = 0; drawable < drawableLimit; drawable++) {
                  if (!isScreenshotProcessRunning) break; // Check before processing drawable
                  SendNUIMessage({
                    action: 'progressUpdate',
                    data: {
                      command: 'newscreenshot',
                      type: componentName,
                      value: drawable,
                      max: drawableVariationCount,
                    },
                  });

                  const textureVariationCount = GetNumberOfPedTextureVariations(
                    currentPed,
                    component,
                    drawable
                  );
                  if (config.includeTextures) {
                    // Limit textures if variationsPerItem is set
                    const textureLimit =
                      variationsPerItem !== null
                        ? Math.min(textureVariationCount, variationsPerItem)
                        : textureVariationCount;

                    for (let texture = 0; texture < textureLimit; texture++) {
                      if (!isScreenshotProcessRunning) break; // Check before processing texture
                      if (
                        !(await LoadComponentVariation(
                          currentPed,
                          component,
                          drawable,
                          texture
                        ))
                      )
                        continue;
                      await takeScreenshotForPedItem(
                        pedType,
                        type,
                        component,
                        drawable,
                        texture
                      );
                    }
                  } else {
                    if (
                      !(await LoadComponentVariation(
                        currentPed,
                        component,
                        drawable
                      ))
                    )
                      continue;
                    await takeScreenshotForPedItem(
                      pedType,
                      type,
                      component,
                      drawable,
                      null
                    );
                  }
                }

                // Reset this component to default before moving to next component
                // This is the key fix - ensure we clean up clothing components after processing
                await LoadComponentVariation(currentPed, component, 0, 0);
                await Delay(config.delayAfterComponentReset || 50);
              } else if (type === 'PROPS') {
                const propVariationCount = GetNumberOfPedPropDrawableVariations(
                  currentPed,
                  component
                );
                // Limit props if itemsPerPosition is set (adjusting for the -1 "none" case)
                const propLimit =
                  itemsPerPosition !== null
                    ? Math.min(propVariationCount, itemsPerPosition)
                    : propVariationCount;

                for (let prop = -1; prop < propLimit; prop++) {
                  if (!isScreenshotProcessRunning) break; // Check before processing prop
                  SendNUIMessage({
                    action: 'progressUpdate',
                    data: {
                      command: 'newscreenshot',
                      type: componentName,
                      value: prop + 1,
                      max: propVariationCount + 1,
                    },
                  });

                  if (prop === -1) {
                    ClearPedProp(currentPed, component);
                    await Delay(config.delayAfterPropClear || 50);
                    // Optional: Screenshot "none" state if desired and configured
                    // await takeScreenshotForPedItem(pedType, type, component, -1, null);
                    continue;
                  }

                  const textureVariationCount =
                    GetNumberOfPedPropTextureVariations(
                      currentPed,
                      component,
                      prop
                    );
                  if (config.includeTextures) {
                    // Limit textures if variationsPerItem is set
                    const textureLimit =
                      variationsPerItem !== null
                        ? Math.min(textureVariationCount, variationsPerItem)
                        : textureVariationCount;

                    for (let texture = 0; texture < textureLimit; texture++) {
                      if (!isScreenshotProcessRunning) break; // Check before processing prop texture
                      if (
                        !(await LoadPropVariation(
                          currentPed,
                          component,
                          prop,
                          texture
                        ))
                      )
                        continue;
                      await takeScreenshotForPedItem(
                        pedType,
                        type,
                        component,
                        prop,
                        texture
                      );
                    }
                  } else {
                    if (!(await LoadPropVariation(currentPed, component, prop)))
                      continue;
                    await takeScreenshotForPedItem(
                      pedType,
                      type,
                      component,
                      prop,
                      null
                    );
                  }
                }
                ClearPedProp(currentPed, component);
                await Delay(config.delayAfterPropClear || 50);
              }
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
