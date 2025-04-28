/// <reference types="@citizenfx/client" />

import {
  FaceData,
  HairData,
  AppearanceData,
  ClothingData,
  ComponentMap,
} from '../types/types';
import { characterData } from './state';
import { Delay } from './utils';

/**
 * =======================================================
 * CHARACTER MODEL & APPEARANCE MANAGEMENT
 * =======================================================
 */

/**
 * Load and set the player model
 * @param {string} model - The model to set
 */
export async function loadAndSetModel(model: string): Promise<void> {
  console.log(`[Character Create] Loading and setting model: ${model}`);

  // Update our character data
  characterData.model = model;

  // Request the model
  const modelHash = GetHashKey(model);
  RequestModel(modelHash);

  // Wait for the model to load with improved timeout handling
  const startTime = GetGameTimer();
  let modelLoaded = false;

  while (!modelLoaded) {
    if (HasModelLoaded(modelHash)) {
      modelLoaded = true;
      break;
    }

    await Delay(100);

    // Timeout after 10 seconds
    if (GetGameTimer() - startTime > 10000) {
      console.error(`[Character Create] Failed to load model: ${model}`);
      // Try one more time
      RequestModel(modelHash);
      await Delay(1000);
      if (HasModelLoaded(modelHash)) {
        modelLoaded = true;
      } else {
        break;
      }
    }
  }

  // Set the player model
  const playerId = PlayerId();
  SetPlayerModel(playerId, modelHash);
  SetModelAsNoLongerNeeded(modelHash);

  // Set default component variation
  const playerPed = PlayerPedId();
  SetPedDefaultComponentVariation(playerPed);
  ClearAllPedProps(playerPed);

  // When model changes, reset to some default clothing values
  // to ensure the character isn't nude
  characterData.clothing.tops = 0;
  characterData.clothing.topsTexture = 0;
  characterData.clothing.undershirt = 0;
  characterData.clothing.undershirtTexture = 0;
  characterData.clothing.legs = 0;
  characterData.clothing.legsTexture = 0;
  characterData.clothing.shoes = 0;
  characterData.clothing.shoesTexture = 0;

  // Apply default clothing
  SetPedComponentVariation(playerPed, 11, 0, 0, 0); // Tops
  SetPedComponentVariation(playerPed, 8, 0, 0, 0); // Undershirt
  SetPedComponentVariation(playerPed, 4, 0, 0, 0); // Legs
  SetPedComponentVariation(playerPed, 6, 0, 0, 0); // Shoes

  console.log('[Character Create] Model loaded and set');
}

/**
 * Apply all character customizations in the correct sequence
 * This ensures consistency across all updates
 */
export function applyFullCharacterData(): void {
  const playerPed = PlayerPedId();

  // First apply head blend data (ethnicity, parents, etc)
  SetPedHeadBlendData(
    playerPed,
    characterData.face.fatherIndex,
    characterData.face.motherIndex,
    0, // Parent 3 (unused)
    characterData.face.fatherIndex,
    characterData.face.motherIndex,
    0, // Parent 3 (unused)
    characterData.face.shapeMix,
    characterData.face.skinMix,
    0.0, // Parent 3 mix (unused)
    false // Is parent inheritance
  );

  // Apply hair
  SetPedComponentVariation(playerPed, 2, characterData.hair.style, 0, 0);
  SetPedHairColor(
    playerPed,
    characterData.hair.color,
    characterData.hair.highlight
  );

  // Apply facial features/overlays
  SetPedHeadOverlay(playerPed, 2, characterData.appearance.eyebrows.style, 1.0);
  SetPedHeadOverlayColor(
    playerPed,
    2,
    1,
    characterData.appearance.eyebrows.color,
    0
  );

  SetPedHeadOverlay(playerPed, 1, characterData.appearance.beard.style, 1.0);
  SetPedHeadOverlayColor(
    playerPed,
    1,
    1,
    characterData.appearance.beard.color,
    0
  );

  SetPedEyeColor(playerPed, characterData.appearance.eyeColor);

  // Apply clothing (component variations)
  // Component IDs reference:
  // 0: Face, 1: Mask, 2: Hair, 3: Torso, 4: Legs
  // 5: Bags/Parachute, 6: Shoes, 7: Accessories
  // 8: Undershirt, 9: Body Armor, 10: Decals, 11: Tops

  applyClothing();

  // Ensure player is facing forward
  SetEntityHeading(playerPed, 0.0);

  console.log('[Character Create] Applied full character customization');
}

/**
 * Apply all clothing items to the character
 * Extracted to separate function for maintainability
 */
export function applyClothing(): void {
  const playerPed = PlayerPedId();

  // Apply basic clothing components
  SetPedComponentVariation(
    playerPed,
    11,
    characterData.clothing.tops,
    characterData.clothing.topsTexture,
    0
  );
  SetPedComponentVariation(
    playerPed,
    3,
    characterData.clothing.torso,
    characterData.clothing.torsoTexture,
    0
  );
  SetPedComponentVariation(
    playerPed,
    8,
    characterData.clothing.undershirt,
    characterData.clothing.undershirtTexture,
    0
  );
  SetPedComponentVariation(
    playerPed,
    4,
    characterData.clothing.legs,
    characterData.clothing.legsTexture,
    0
  );
  SetPedComponentVariation(
    playerPed,
    6,
    characterData.clothing.shoes,
    characterData.clothing.shoesTexture,
    0
  );
  SetPedComponentVariation(
    playerPed,
    7,
    characterData.clothing.accessories,
    characterData.clothing.accessoriesTexture,
    0
  );

  // Apply optional clothing if present
  if (characterData.clothing.mask !== undefined) {
    SetPedComponentVariation(
      playerPed,
      1,
      characterData.clothing.mask,
      characterData.clothing.maskTexture || 0,
      0
    );
  }

  if (characterData.clothing.bags !== undefined) {
    SetPedComponentVariation(
      playerPed,
      5,
      characterData.clothing.bags,
      characterData.clothing.bagsTexture || 0,
      0
    );
  }

  if (characterData.clothing.armor !== undefined) {
    SetPedComponentVariation(
      playerPed,
      9,
      characterData.clothing.armor,
      characterData.clothing.armorTexture || 0,
      0
    );
  }

  if (characterData.clothing.decals !== undefined) {
    SetPedComponentVariation(
      playerPed,
      10,
      characterData.clothing.decals,
      characterData.clothing.decalsTexture || 0,
      0
    );
  }

  // Apply props if present
  applyProps();
}

/**
 * Apply all character props (hats, glasses, etc.)
 * Extracted to separate function for maintainability
 */
export function applyProps(): void {
  const playerPed = PlayerPedId();

  if (characterData.props) {
    if (characterData.props.hat !== undefined) {
      SetPedPropIndex(
        playerPed,
        0,
        characterData.props.hat,
        characterData.props.hatTexture || 0,
        true
      );
    }

    if (characterData.props.glasses !== undefined) {
      SetPedPropIndex(
        playerPed,
        1,
        characterData.props.glasses,
        characterData.props.glassesTexture || 0,
        true
      );
    }

    if (characterData.props.ears !== undefined) {
      SetPedPropIndex(
        playerPed,
        2,
        characterData.props.ears,
        characterData.props.earsTexture || 0,
        true
      );
    }

    if (characterData.props.watches !== undefined) {
      SetPedPropIndex(
        playerPed,
        6,
        characterData.props.watches,
        characterData.props.watchesTexture || 0,
        true
      );
    }

    if (characterData.props.bracelets !== undefined) {
      SetPedPropIndex(
        playerPed,
        7,
        characterData.props.bracelets,
        characterData.props.braceletsTexture || 0,
        true
      );
    }
  }
}

/**
 * Update the player model
 * @param {string} model - The model to set
 */
export async function updateModel(model: string): Promise<void> {
  console.log(`[Character Create] Updating player model to: ${model}`);

  // Update the model
  await loadAndSetModel(model);

  // After model is changed, we need to reapply all customizations
  applyFullCharacterData();
}

/**
 * Update the player's face
 * @param {keyof FaceData} key - The face property to update
 * @param {number} value - The value to set
 */
export function updateFace(key: keyof FaceData, value: number): void {
  console.log(`[Character Create] Updating face property: ${key} = ${value}`);

  // Update our character data
  characterData.face[key] = value;

  // Apply full character data - this ensures consistency
  applyFullCharacterData();
}

/**
 * Update the player's hair
 * @param {keyof HairData} key - The hair property to update
 * @param {number} value - The value to set
 */
export function updateHair(key: keyof HairData, value: number): void {
  console.log(`[Character Create] Updating hair property: ${key} = ${value}`);

  // Update our character data
  characterData.hair[key] = value;

  // Apply the specific hair changes
  const playerPed = PlayerPedId();

  if (key === 'style') {
    SetPedComponentVariation(playerPed, 2, value, 0, 0);
  } else if (key === 'color' || key === 'highlight') {
    SetPedHairColor(
      playerPed,
      characterData.hair.color,
      characterData.hair.highlight
    );
  }
}

/**
 * Update the player's appearance
 * @param {keyof AppearanceData} category - The appearance category to update
 * @param {string} key - The appearance property to update
 * @param {number} value - The value to set
 */
export function updateAppearance(
  category: keyof AppearanceData,
  key: string,
  value: number
): void {
  console.log(
    `[Character Create] Updating appearance: category=${category}, key=${key}, value=${value}`
  );

  // Update our character data - need to handle nested objects and basic values
  const categoryData = characterData.appearance[category];

  if (typeof categoryData === 'object' && categoryData !== null) {
    // It's a nested object like eyebrows or beard
    (categoryData as any)[key] = value;
  } else if (category === 'eyeColor') {
    // It's a direct value like eyeColor
    characterData.appearance.eyeColor = value;
  }

  // Apply the specific appearance changes
  const playerPed = PlayerPedId();

  if (category === 'eyebrows') {
    if (key === 'style') {
      SetPedHeadOverlay(playerPed, 2, value, 1.0);
    } else if (key === 'color') {
      SetPedHeadOverlayColor(playerPed, 2, 1, value, 0);
    }
  } else if (category === 'beard') {
    if (key === 'style') {
      SetPedHeadOverlay(playerPed, 1, value, 1.0);
    } else if (key === 'color') {
      SetPedHeadOverlayColor(playerPed, 1, 1, value, 0);
    }
  } else if (category === 'eyeColor') {
    SetPedEyeColor(playerPed, value);
  }
}

/**
 * Update the player's clothing
 * @param {keyof ClothingData} key - The clothing property to update
 * @param {number} value - The value to set
 */
export function updateClothing(key: keyof ClothingData, value: number): void {
  console.log(`[Character Create] Updating clothing: ${key} = ${value}`);

  // Update our character data
  characterData.clothing[key] = value;

  // Apply the specific clothing changes
  const playerPed = PlayerPedId();

  // Component IDs mapping
  const componentMap: ComponentMap = {
    'tops': 11,
    'torso': 3,
    'undershirt': 8,
    'legs': 4,
    'shoes': 6,
    'accessories': 7,
    'mask': 1,
    'bags': 5,
    'armor': 9,
    'decals': 10,
  };

  // Handle style changes (drawable IDs)
  if (key.endsWith('Texture')) {
    // It's a texture update
    // Extract the base key by removing "Texture" suffix
    const baseKeyString = key.replace('Texture', '');

    // Check if this is a valid base key that exists in our component map
    if (baseKeyString in componentMap) {
      // Type assertion to help TypeScript understand this is a valid key
      const baseKey = baseKeyString as keyof typeof componentMap;

      // Get the drawable ID for this component from our character data
      let drawableId = 0;

      // We need to safely access the baseKey in clothing data
      if (baseKeyString in characterData.clothing) {
        // TypeScript knows baseKeyString is a key of ClothingData at this point
        drawableId =
          characterData.clothing[baseKeyString as keyof ClothingData];
      }

      // Apply the component variation with the texture update
      SetPedComponentVariation(
        playerPed,
        componentMap[baseKey],
        drawableId,
        value,
        0
      );
    }
  } else {
    // It's a drawable (style) update
    if (key in componentMap) {
      // This is a base component, get its corresponding texture
      const textureKey = `${key}Texture` as keyof ClothingData;
      const textureId = characterData.clothing[textureKey] || 0;

      // Apply the component variation with the drawable update
      SetPedComponentVariation(
        playerPed,
        componentMap[key as keyof typeof componentMap],
        value,
        textureId,
        0
      );
    }
  }
}
