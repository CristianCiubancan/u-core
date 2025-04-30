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

// Helper function to map category name to component ID
function getCategoryComponentId(
  categoryName: string
): { type: 'CLOTHING' | 'PROPS'; id: number } | null {
  // Map of category names to their component types and IDs
  const categoryMap: Record<
    string,
    { type: 'CLOTHING' | 'PROPS'; id: number }
  > = {
    // Clothing components
    'masks': { type: 'CLOTHING', id: 1 },
    'torsos': { type: 'CLOTHING', id: 3 },
    'legs': { type: 'CLOTHING', id: 4 },
    'bags': { type: 'CLOTHING', id: 5 },
    'shoes': { type: 'CLOTHING', id: 6 },
    'accessories': { type: 'CLOTHING', id: 7 },
    'undershirts': { type: 'CLOTHING', id: 8 },
    'bodyarmors': { type: 'CLOTHING', id: 9 },
    'tops': { type: 'CLOTHING', id: 11 },

    // Props
    'hats': { type: 'PROPS', id: 0 },
    'glasses': { type: 'PROPS', id: 1 },
    'ears': { type: 'PROPS', id: 2 },
    'watches': { type: 'PROPS', id: 6 },
    'bracelets': { type: 'PROPS', id: 7 },
  };

  // Convert to lowercase for case-insensitive matching
  const normalizedCategory = categoryName.toLowerCase();
  return categoryMap[normalizedCategory] || null;
}

// Main function to initialize the new command
export function initializeNewPedCommands() {
  RegisterCommand(
    'newscreenshot', // *** Renamed command ***
    async (_source: number, args: string[]) => {
      // Parse optional arguments
      let argIndex = 0;
      let sex = 'both';
      let category: { type: 'CLOTHING' | 'PROPS'; id: number } | null = null;
      let itemsPerPosition: number | null = null;
      let variationsPerItem: number | null = null;

      // Process arguments
      if (args.length > 0) {
        // Check if first argument is a sex specification
        if (['male', 'female', 'both'].includes(args[0].toLowerCase())) {
          sex = args[0].toLowerCase();
          argIndex++;

          // Check if second argument is a category
          if (args.length > argIndex) {
            category = getCategoryComponentId(args[argIndex]);
            if (category) {
              argIndex++;
            }
          }
        } else {
          // Check if first argument is a category
          category = getCategoryComponentId(args[0]);
          if (category) {
            argIndex++;
          }
        }

        // Parse remaining arguments as numeric limits
        if (args.length > argIndex) {
          const itemsPerPositionArg = parseInt(args[argIndex]);
          if (!isNaN(itemsPerPositionArg)) {
            itemsPerPosition = itemsPerPositionArg;
            argIndex++;

            if (args.length > argIndex) {
              const variationsPerItemArg = parseInt(args[argIndex]);
              if (!isNaN(variationsPerItemArg)) {
                variationsPerItem = variationsPerItemArg;
              }
            }
          }
        }
      }

      if (config.debug) {
        console.log(
          `DEBUG: /newscreenshot called with sex=${sex}, category=${
            category ? `${category.type} ${category.id}` : 'all'
          }, itemsPerPosition=${itemsPerPosition}, variationsPerItem=${variationsPerItem}`
        );
      }

      if (isScreenshotProcessRunning) {
        console.log('ERROR: Screenshot process is already running.');
        // Optionally send a chat message back to the user
        return;
      }
      isScreenshotProcessRunning = true; // Set flag to true

      // Determine which model hashes to process based on sex parameter
      let modelHashes: number[] = [];
      if (sex === 'male' || sex === 'both') {
        modelHashes.push(GetHashKey('mp_m_freemode_01'));
      }
      if (sex === 'female' || sex === 'both') {
        modelHashes.push(GetHashKey('mp_f_freemode_01'));
      }

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
            // If a specific category is provided and it's a CLOTHING type, only process that component
            const clothingComponents =
              category && category.type === 'CLOTHING'
                ? [category.id.toString()]
                : Object.keys(pedVariations.CLOTHING);

            for (const stringComponent of clothingComponents) {
              if (!isScreenshotProcessRunning) break; // Check before processing component
              const component = parseInt(stringComponent);

              // Skip if the component doesn't exist in variations data
              if (!pedVariations.CLOTHING[component]) {
                console.warn(
                  `WARN: Component ${component} not found in variations data for ${pedType}. Skipping.`
                );
                continue;
              }

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
            // If a specific category is provided and it's a PROPS type, only process that component
            const propsComponents =
              category && category.type === 'PROPS'
                ? [category.id.toString()]
                : Object.keys(pedVariations.PROPS);

            for (const stringComponent of propsComponents) {
              if (!isScreenshotProcessRunning) break; // Check before processing component
              const component = parseInt(stringComponent);

              // Skip if the component doesn't exist in variations data
              if (!pedVariations.PROPS[component]) {
                console.warn(
                  `WARN: Prop component ${component} not found in variations data for ${pedType}. Skipping.`
                );
                continue;
              }

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
    (_source: number, _args: string[]) => {
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
