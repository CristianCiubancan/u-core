/// <reference types="@citizenfx/client" />

import { destroyCamera, setupCameraForComponent } from './camera';
import { setActiveInterval } from './events';
import {
  cleanupPedAfterScreenshot,
  LoadComponentVariation,
  LoadPropVariation,
  ResetPedComponents,
  setupPedForScreenshot,
} from './ped';
import { config, Delay, playerId } from './utils';
import {
  startWeatherResource,
  stopWeatherResource,
  setWeatherTime,
} from './weather'; // Import weather functions

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

export function initializePedCommands() {
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
}
