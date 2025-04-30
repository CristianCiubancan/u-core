/// <reference types="@citizenfx/client" />

import { config, Delay } from './utils';

console.log('DEBUG: Initializing utility commands...'); // Log for initialization

export function initializeUtilsCommands() {
  console.log('DEBUG: Registering listvariations command...'); // Added log

  // Command to list clothing and prop variations
  RegisterCommand(
    'listvariations',
    async (source: number, args: string[]) => {
      console.log('DEBUG: /listvariations command started.'); // Debug log at start

      const variationsData: Record<string, any> = { male: {}, female: {} }; // Structure to hold results

      try {
        const gender = args[0]?.toLowerCase() || 'both'; // 'male', 'female', or 'both'

        if (gender !== 'male' && gender !== 'female' && gender !== 'both') {
          console.log('Usage: /listvariations [gender: male/female/both]');
          console.log(
            'DEBUG: /listvariations command finished (invalid gender).'
          ); // Debug log at end
          return;
        }

        const modelHashes: number[] = [];
        if (gender === 'male' || gender === 'both') {
          modelHashes.push(GetHashKey('mp_m_freemode_01'));
        }
        if (gender === 'female' || gender === 'both') {
          modelHashes.push(GetHashKey('mp_f_freemode_01'));
        }

        // console.log(`Listing variations for gender(s): ${gender}`); // No longer needed for console

        for (const modelHash of modelHashes) {
          if (!IsModelValid(modelHash)) {
            console.log(`Invalid model hash: ${modelHash}`);
            continue;
          }

          if (!HasModelLoaded(modelHash)) {
            RequestModel(modelHash);
            const loadStart = GetGameTimer();
            while (!HasModelLoaded(modelHash)) {
              await Delay(100);
              if (GetGameTimer() - loadStart > config.modelLoadTimeout) {
                console.error(
                  `ERROR: Timeout loading player model ${modelHash}`
                );
                break; // Exit model loop if loading fails
              }
            }
            if (!HasModelLoaded(modelHash)) continue; // Skip if model still didn't load
          }

          SetPlayerModel(PlayerId(), modelHash);
          await Delay(250); // Give game time to set model
          const ped = PlayerPedId(); // Get ped ID *after* setting the model

          const pedType =
            modelHash === GetHashKey('mp_m_freemode_01') ? 'male' : 'female';
          // console.log(`--- ${pedType.toUpperCase()} VARIATIONS ---`); // No longer needed for console
          variationsData[pedType] = { CLOTHING: {}, PROPS: {} }; // Initialize gender structure

          // List Clothing Variations
          // console.log('--- CLOTHING ---'); // No longer needed for console
          const clothingComponents = Object.keys(
            config.cameraSettings.CLOTHING
          ).map(Number);
          // console.log(`DEBUG: Found ${clothingComponents.length} clothing components.`); // No longer needed for console
          for (const componentId of clothingComponents) {
            // console.log(`DEBUG: Processing clothing component ${componentId}`); // No longer needed for console
            const drawableCount = GetNumberOfPedDrawableVariations(
              ped,
              componentId
            );
            // console.log(`Component ${componentId}: ${drawableCount} drawables`); // No longer needed for console
            variationsData[pedType].CLOTHING[componentId] = {}; // Initialize component structure

            for (let drawableId = 0; drawableId < drawableCount; drawableId++) {
              const textureCount = GetNumberOfPedTextureVariations(
                ped,
                componentId,
                drawableId
              );
              // console.log(`  Drawable ${drawableId}: ${textureCount} textures`); // No longer needed for console
              variationsData[pedType].CLOTHING[componentId][drawableId] =
                textureCount; // Store texture count

              // Removed detailed variation info logging
            }
          }

          // List Prop Variations
          // console.log('--- PROPS ---'); // No longer needed for console
          const propComponents = Object.keys(config.cameraSettings.PROPS).map(
            Number
          );
          // console.log(`DEBUG: Found ${propComponents.length} prop components.`); // No longer needed for console
          for (const componentId of propComponents) {
            // console.log(`DEBUG: Processing prop component ${componentId}`); // No longer needed for console
            const propCount = GetNumberOfPedPropDrawableVariations(
              ped,
              componentId
            );
            // console.log(`Prop Component ${componentId}: ${propCount + 1} props (including none)`); // No longer needed for console
            variationsData[pedType].PROPS[componentId] = {}; // Initialize component structure

            for (let propId = -1; propId < propCount; propId++) {
              // console.log(`DEBUG: Processing prop ${propId} for component ${componentId}`); // No longer needed for console
              if (propId === -1) {
                // console.log(`  Prop -1: (None)`); // No longer needed for console
                variationsData[pedType].PROPS[componentId][-1] = 0; // Indicate 'none' state (0 textures)
                continue;
              }
              const textureCount = GetNumberOfPedPropTextureVariations(
                ped,
                componentId,
                propId
              );
              // console.log(`  Prop ${propId}: ${textureCount} textures`); // No longer needed for console
              variationsData[pedType].PROPS[componentId][propId] = textureCount; // Store texture count

              // Removed texture loop logging
            }
          }

          SetModelAsNoLongerNeeded(modelHash);
        }

        // Filter out empty gender objects if only one was requested
        if (gender === 'male') delete variationsData.female;
        if (gender === 'female') delete variationsData.male;

        // Convert data to JSON
        const jsonData = JSON.stringify(variationsData, null, 2); // Pretty print JSON

        // Send data to server for saving
        emitNet('greenscreener:saveVariationsJson', jsonData);
        console.log('Sent variation data to server for saving.');
        console.log('DEBUG: /listvariations command finished successfully.'); // Debug log at end (client part done)
      } catch (error: any) {
        console.error(`ERROR in /listvariations command: ${error.message}`); // Log any errors
        console.log('DEBUG: /listvariations command finished with error.'); // Debug log at end
      }
    },
    false
  );

  // Add other utility command registrations here if needed in the future
  console.log('DEBUG: Utility commands initialized.');
}
