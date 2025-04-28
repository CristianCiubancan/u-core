/// <reference types="@citizenfx/client" />

import { config, Delay, playerId, QBCore } from './utils';
import {
  setWeatherTime,
  stopWeatherResource,
  startWeatherResource,
} from './weather';
import {
  setupCameraForComponent,
  setupCameraForObject,
  setupCameraForVehicle,
  destroyCamera,
} from './camera';
import {
  ResetPedComponents,
  LoadComponentVariation,
  LoadPropVariation,
  setupPedForScreenshot,
  cleanupPedAfterScreenshot,
  ClearAllPedProps,
  SetPedOnGround,
} from './ped';
import {
  getAllVehicleModels,
  createGreenScreenVehicle,
  takeScreenshotForVehicle,
  cleanupVehicle,
} from './vehicle';
import {
  createGreenScreenObject,
  takeScreenshotForObject,
  cleanupObject,
  getObjectModelHash,
} from './object';
import { setActiveInterval } from './events'; // Import setActiveInterval

let currentPed: number | null = null;
let taskInterval: NodeJS.Timeout | null = null;

// Helper function to take screenshot for components/props
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

  // Ensure weather/time are set (might be redundant if called within loop, but safe)
  setWeatherTime();
  await Delay(50);

  // Setup camera specifically for this component/prop view
  await setupCameraForComponent(currentPed, cameraInfo);
  await Delay(50);

  // Emit screenshot request
  const textureSuffix =
    texture !== null && texture !== undefined ? `_${texture}` : '';
  const filename = `${pedType}_${
    type === 'PROPS' ? 'prop_' : ''
  }${component}_${itemId}${textureSuffix}`;

  // Track this screenshot request
  exports[GetCurrentResourceName()].trackScreenshotRequest();

  emitNet('takeScreenshot', filename, 'clothing');
  if (config.debug)
    console.log(`DEBUG: Screenshot request emitted for ${filename}`);

  await Delay(config.screenshotDelay || 2000); // Use configurable delay
}

// --- Command Registrations ---

export function initializeCommands() {
  RegisterCommand(
    'screenshot',
    async (source: number, args: string[]) => {
      const modelHashes = [
        GetHashKey('mp_m_freemode_01'),
        GetHashKey('mp_f_freemode_01'),
      ];

      SendNUIMessage({ action: 'start' });
      if (!stopWeatherResource()) return;
      DisableIdleCamera(true);
      await Delay(100);

      try {
        for (const modelHash of modelHashes) {
          if (!IsModelValid(modelHash)) continue;

          if (!HasModelLoaded(modelHash)) {
            RequestModel(modelHash);
            const loadStart = GetGameTimer();
            while (!HasModelLoaded(modelHash)) {
              await Delay(100);
              if (GetGameTimer() - loadStart > config.modelLoadTimeout) {
                console.error(
                  `ERROR: Timeout loading player model ${modelHash}`
                );
                throw new Error('Model load timeout'); // Exit command if model fails
              }
            }
          }

          SetPlayerModel(playerId, modelHash);
          await Delay(250); // Increased delay after setting model

          currentPed = PlayerPedId();
          const pedType =
            modelHash === GetHashKey('mp_m_freemode_01') ? 'male' : 'female';

          setupPedForScreenshot(currentPed);
          SetPlayerControl(playerId, false, 0); // Added flags argument

          // Start interval to clear tasks
          taskInterval = setInterval(() => {
            if (currentPed) ClearPedTasksImmediately(currentPed);
          }, 1);
          setActiveInterval(taskInterval); // Register interval with events module

          await ResetPedComponents(currentPed);
          await Delay(150);

          for (const type of Object.keys(config.cameraSettings) as Array<
            'CLOTHING' | 'PROPS'
          >) {
            if (type !== 'CLOTHING' && type !== 'PROPS') continue; // Only process clothing and props

            for (const stringComponent of Object.keys(
              config.cameraSettings[type]
            )) {
              const component = parseInt(stringComponent);
              const componentName =
                config.cameraSettings[type]?.[component]?.name ||
                `Comp ${component}`;

              if (type === 'CLOTHING') {
                const drawableVariationCount = GetNumberOfPedDrawableVariations(
                  currentPed,
                  component
                );
                for (
                  let drawable = 0;
                  drawable < drawableVariationCount;
                  drawable++
                ) {
                  SendNUIMessage({
                    action: 'progressUpdate',
                    data: {
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
                    for (
                      let texture = 0;
                      texture < textureVariationCount;
                      texture++
                    ) {
                      if (
                        !(await LoadComponentVariation(
                          currentPed,
                          component,
                          drawable,
                          texture
                        ))
                      )
                        continue; // Skip if loading failed
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
                      continue; // Skip if loading failed
                    await takeScreenshotForPedItem(
                      pedType,
                      type,
                      component,
                      drawable,
                      null
                    );
                  }
                }
              } else if (type === 'PROPS') {
                // Ensure a visible base torso might be needed depending on prop type
                // SetPedComponentVariation(currentPed, 3, 15, 0, 0); // Example: Base torso
                // await Delay(50);

                const propVariationCount = GetNumberOfPedPropDrawableVariations(
                  currentPed,
                  component
                );
                for (let prop = -1; prop < propVariationCount; prop++) {
                  // Start from -1 to capture "none" state
                  SendNUIMessage({
                    action: 'progressUpdate',
                    data: {
                      type: componentName,
                      value: prop + 1,
                      max: propVariationCount + 1,
                    }, // Adjust progress for -1 start
                  });

                  if (prop === -1) {
                    // Handle "none" case
                    ClearPedProp(currentPed, component);
                    await Delay(50);
                    // Decide if you want a screenshot of "none" - might need specific camera setup
                    // await takeScreenshotForPedItem(pedType, type, component, -1, null); // Example call for "none"
                    continue; // Move to next prop
                  }

                  const textureVariationCount =
                    GetNumberOfPedPropTextureVariations(
                      currentPed,
                      component,
                      prop
                    );
                  if (config.includeTextures) {
                    for (
                      let texture = 0;
                      texture < textureVariationCount;
                      texture++
                    ) {
                      if (
                        !(await LoadPropVariation(
                          currentPed,
                          component,
                          prop,
                          texture
                        ))
                      )
                        continue; // Skip if loading failed
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
                      continue; // Skip if loading failed
                    await takeScreenshotForPedItem(
                      pedType,
                      type,
                      component,
                      prop,
                      null
                    );
                  }
                }
                // Clear the prop after iterating through its variations
                ClearPedProp(currentPed, component);
                await Delay(50);
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
      } catch (error) {
        console.error('ERROR in /screenshot command:', error);
        // Ensure cleanup happens even on error
        if (taskInterval) clearInterval(taskInterval);
        setActiveInterval(null);
        if (currentPed) cleanupPedAfterScreenshot(currentPed);
        currentPed = null;
        destroyCamera();
        startWeatherResource();
        DisableIdleCamera(false);
        SendNUIMessage({
          action: 'end',
          error: error.message || 'An unknown error occurred.',
        });
        return; // Stop execution
      }

      // Final cleanup after all models
      destroyCamera();
      startWeatherResource();
      DisableIdleCamera(false);
      SendNUIMessage({ action: 'end' });
      console.log('Screenshot command finished successfully.');
    },
    false
  ); // Restricted: false (or true if needed)

  RegisterCommand(
    'customscreenshot',
    async (_source: number, args: string[]) => {
      if (args.length < 4) {
        console.log(
          "Usage: /customscreenshot <component_id> <drawable_id/'all'> <type: CLOTHING/PROPS> <gender: male/female/both> [camera_json]"
        );
        return;
      }

      const component = parseInt(args[0]);
      const drawableArg = args[1].toLowerCase();
      const type = args[2].toUpperCase() as 'CLOTHING' | 'PROPS';
      const gender = args[3].toLowerCase();
      let cameraSettingsOverride: any = null;

      if (isNaN(component) || (type !== 'CLOTHING' && type !== 'PROPS')) {
        console.log('Invalid component ID or type.');
        return;
      }

      if (args.length > 4) {
        try {
          cameraSettingsOverride = JSON.parse(args.slice(4).join(' '));
        } catch (e) {
          console.log('Invalid camera settings JSON provided.');
          return;
        }
      }

      let modelHashes: number[] = [];
      if (gender === 'male') modelHashes = [GetHashKey('mp_m_freemode_01')];
      else if (gender === 'female')
        modelHashes = [GetHashKey('mp_f_freemode_01')];
      else if (gender === 'both')
        modelHashes = [
          GetHashKey('mp_m_freemode_01'),
          GetHashKey('mp_f_freemode_01'),
        ];
      else {
        console.log(
          "Invalid gender specified. Use 'male', 'female', or 'both'."
        );
        return;
      }

      SendNUIMessage({ action: 'start' }); // Indicate start
      if (!stopWeatherResource()) return;
      DisableIdleCamera(true);
      await Delay(100);

      try {
        for (const modelHash of modelHashes) {
          if (!IsModelValid(modelHash)) continue;

          if (!HasModelLoaded(modelHash)) {
            RequestModel(modelHash);
            const loadStart = GetGameTimer();
            while (!HasModelLoaded(modelHash)) {
              await Delay(100);
              if (GetGameTimer() - loadStart > config.modelLoadTimeout) {
                console.error(
                  `ERROR: Timeout loading player model ${modelHash}`
                );
                throw new Error('Model load timeout');
              }
            }
          }

          SetPlayerModel(playerId, modelHash);
          await Delay(250);

          currentPed = PlayerPedId();
          const pedType =
            modelHash === GetHashKey('mp_m_freemode_01') ? 'male' : 'female';

          setupPedForScreenshot(currentPed);
          SetPlayerControl(playerId, false, 0); // Added flags argument
          taskInterval = setInterval(() => {
            if (currentPed) ClearPedTasksImmediately(currentPed);
          }, 1);
          setActiveInterval(taskInterval);

          await ResetPedComponents(currentPed); // Reset before applying custom item
          await Delay(150);

          const componentName =
            config.cameraSettings[type]?.[component]?.name ||
            `Comp ${component}`;

          if (drawableArg === 'all') {
            if (type === 'CLOTHING') {
              const drawableCount = GetNumberOfPedDrawableVariations(
                currentPed,
                component
              );
              for (let drawable = 0; drawable < drawableCount; drawable++) {
                SendNUIMessage({
                  action: 'progressUpdate',
                  data: {
                    type: componentName,
                    value: drawable,
                    max: drawableCount,
                  },
                });
                const textureCount = GetNumberOfPedTextureVariations(
                  currentPed,
                  component,
                  drawable
                );
                if (config.includeTextures) {
                  for (let texture = 0; texture < textureCount; texture++) {
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
                      texture,
                      cameraSettingsOverride
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
                    null,
                    cameraSettingsOverride
                  );
                }
              }
            } else {
              // PROPS
              const propCount = GetNumberOfPedPropDrawableVariations(
                currentPed,
                component
              );
              for (let prop = -1; prop < propCount; prop++) {
                // Include -1 for "none"
                SendNUIMessage({
                  action: 'progressUpdate',
                  data: {
                    type: componentName,
                    value: prop + 1,
                    max: propCount + 1,
                  },
                });
                if (prop === -1) {
                  ClearPedProp(currentPed, component);
                  await Delay(50);
                  // Optional: Screenshot "none" state if desired
                  // await takeScreenshotForPedItem(pedType, type, component, -1, null, cameraSettingsOverride);
                  continue;
                }
                const textureCount = GetNumberOfPedPropTextureVariations(
                  currentPed,
                  component,
                  prop
                );
                if (config.includeTextures) {
                  for (let texture = 0; texture < textureCount; texture++) {
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
                      texture,
                      cameraSettingsOverride
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
                    null,
                    cameraSettingsOverride
                  );
                }
              }
              ClearPedProp(currentPed, component); // Clear prop after loop
              await Delay(50);
            }
          } else {
            // Specific drawable/prop ID
            const itemId = parseInt(drawableArg);
            if (isNaN(itemId)) {
              console.log('Invalid drawable/prop ID provided.');
              continue; // Skip to next model if ID is bad
            }

            SendNUIMessage({
              action: 'progressUpdate',
              data: { type: componentName, value: 1, max: 1 },
            }); // Single item progress

            if (type === 'CLOTHING') {
              const textureCount = GetNumberOfPedTextureVariations(
                currentPed,
                component,
                itemId
              );
              if (config.includeTextures) {
                for (let texture = 0; texture < textureCount; texture++) {
                  if (
                    !(await LoadComponentVariation(
                      currentPed,
                      component,
                      itemId,
                      texture
                    ))
                  )
                    continue;
                  await takeScreenshotForPedItem(
                    pedType,
                    type,
                    component,
                    itemId,
                    texture,
                    cameraSettingsOverride
                  );
                }
              } else {
                if (
                  !(await LoadComponentVariation(currentPed, component, itemId))
                )
                  continue;
                await takeScreenshotForPedItem(
                  pedType,
                  type,
                  component,
                  itemId,
                  null,
                  cameraSettingsOverride
                );
              }
            } else {
              // PROPS
              const textureCount = GetNumberOfPedPropTextureVariations(
                currentPed,
                component,
                itemId
              );
              if (config.includeTextures) {
                for (let texture = 0; texture < textureCount; texture++) {
                  if (
                    !(await LoadPropVariation(
                      currentPed,
                      component,
                      itemId,
                      texture
                    ))
                  )
                    continue;
                  await takeScreenshotForPedItem(
                    pedType,
                    type,
                    component,
                    itemId,
                    texture,
                    cameraSettingsOverride
                  );
                }
              } else {
                if (!(await LoadPropVariation(currentPed, component, itemId)))
                  continue;
                await takeScreenshotForPedItem(
                  pedType,
                  type,
                  component,
                  itemId,
                  null,
                  cameraSettingsOverride
                );
              }
              ClearPedProp(currentPed, component); // Clear prop after taking screenshot
              await Delay(50);
            }
          }

          // Cleanup after processing a model
          cleanupPedAfterScreenshot(currentPed, taskInterval);
          taskInterval = null;
          setActiveInterval(null);
          currentPed = null;
          SetModelAsNoLongerNeeded(modelHash);
        }
      } catch (error) {
        console.error('ERROR in /customscreenshot command:', error);
        if (taskInterval) clearInterval(taskInterval);
        setActiveInterval(null);
        if (currentPed) cleanupPedAfterScreenshot(currentPed);
        currentPed = null;
        destroyCamera();
        startWeatherResource();
        DisableIdleCamera(false);
        SendNUIMessage({
          action: 'end',
          error: error.message || 'An unknown error occurred.',
        });
        return;
      }

      // Final cleanup
      destroyCamera();
      startWeatherResource();
      DisableIdleCamera(false);
      SendNUIMessage({ action: 'end' });
      console.log('Custom screenshot command finished successfully.');
    },
    false
  );

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

  // --- Add Chat Suggestions ---
  setImmediate(() => {
    emit('chat:addSuggestions', [
      {
        name: '/screenshot',
        help: 'Generate clothing & prop screenshots for both genders.',
      },
      {
        name: '/customscreenshot',
        help: 'Generate specific clothing/prop screenshots.',
        params: [
          { name: 'component_id', help: 'Clothing/Prop Component ID' },
          { name: 'drawable_id/"all"', help: 'Drawable/Prop ID or "all"' },
          { name: 'type', help: 'CLOTHING or PROPS' },
          { name: 'gender', help: 'male, female, or both' },
          {
            name: 'camera_json',
            help: '(Optional) JSON camera settings override',
          },
        ],
      },
      {
        name: '/screenshotobject',
        help: 'Generate screenshot for a specific object or weapon.',
        params: [
          { name: 'object_hash_or_name', help: 'Object/Weapon Hash or Name' },
        ],
      },
      {
        name: '/screenshotvehicle',
        help: 'Generate screenshot(s) for vehicle(s).',
        params: [
          { name: 'model_name/"all"', help: 'Vehicle Model Name or "all"' },
          { name: 'primary_color', help: '(Optional) Primary Color ID' },
          { name: 'secondary_color', help: '(Optional) Secondary Color ID' },
        ],
      },
    ]);
  });
}
