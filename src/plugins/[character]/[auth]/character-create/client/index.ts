/// <reference types="@citizenfx/client" />

// Import types from the types file
import {
  CharacterData,
  FaceData,
  HairData,
  AppearanceData,
  ClothingData,
  CameraFocus,
  CameraDirection,
  ZoomDirection,
  ComponentMap,
  ModelUpdateData,
  FaceUpdateData,
  HairUpdateData,
  AppearanceUpdateData,
  ClothingUpdateData,
  CameraRotationData,
  CameraZoomData,
  CameraFocusData,
  SaveCharacterData,
  NuiCallback,
} from '../types/types';

// Wrap everything in a namespace to avoid conflicts with other plugins
// Constants
const NUI_EVENT = 'character-create:toggle-ui';
const COMMAND_NAME = 'character-create:toggle_ui';

// Variable to track UI state
let uiVisible = false;

// Camera variables
let cameraRotation = 0;
let cameraZoom = 1.5;
let cameraFocus: CameraFocus = 'body';

// Store camera handle
let characterCreationCamera: number | null = null;

// Initialize default character data
const characterData: CharacterData = {
  model: 'mp_m_freemode_01',
  face: {
    fatherIndex: 0,
    motherIndex: 0,
    shapeMix: 0.5,
    skinMix: 0.5,
  },
  hair: {
    style: 0,
    color: 0,
    highlight: 0,
  },
  appearance: {
    eyebrows: {
      style: 0,
      color: 0,
    },
    beard: {
      style: 0,
      color: 0,
    },
    eyeColor: 0,
  },
  clothing: {
    tops: 0,
    topsTexture: 0,
    torso: 0,
    torsoTexture: 0,
    undershirt: 0,
    undershirtTexture: 0,
    legs: 0,
    legsTexture: 0,
    shoes: 0,
    shoesTexture: 0,
    accessories: 0,
    accessoriesTexture: 0,
  },
};

/**
 * Toggle UI visibility
 * @param {boolean} state - The state to set the UI to (true = visible, false = hidden)
 */
function toggleUI(state: boolean): void {
  console.log(
    `[Character Create] Toggling UI to ${state ? 'visible' : 'hidden'}`
  );
  uiVisible = state;

  // Send message to NUI
  SendNUIMessage({
    action: NUI_EVENT,
    data: state,
  });

  // Set focus to UI when visible
  SetNuiFocus(state, state);

  // If showing UI, set up the character creation environment
  if (state) {
    setupCharacterCreation();
  } else {
    cleanupCharacterCreation();
  }
}

/**
 * Set up the character creation environment
 */
async function setupCharacterCreation(): Promise<void> {
  console.log('[Character Create] Setting up character creation environment');

  // Always ensure we have a valid character model when opening the UI
  await loadAndSetModel(characterData.model);

  // Apply all customizations in the proper order
  applyFullCharacterData();

  // Set up camera
  setupCamera();
}

/**
 * Apply all character customizations in the correct sequence
 * This ensures consistency across all updates
 */
function applyFullCharacterData(): void {
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

  // Ensure player is facing forward
  SetEntityHeading(playerPed, 0.0);

  console.log('[Character Create] Applied full character customization');
}

/**
 * Load and set the player model
 * @param {string} model - The model to set
 */
async function loadAndSetModel(model: string): Promise<void> {
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
 * Set up the camera for character creation
 */
function setupCamera(): void {
  // Disable rendering of the player's camera while in character creation
  NetworkSetInSpectatorMode(true, PlayerPedId());

  // Create a camera pointing at the player
  updateCameraPosition();
}

/**
 * Update the camera position based on current rotation, zoom, and focus
 */
function updateCameraPosition(): void {
  const playerPed = PlayerPedId();
  const coords = GetEntityCoords(playerPed, true);

  // Calculate camera position based on rotation and zoom
  const angleRad = (cameraRotation * Math.PI) / 180;
  let cameraHeight = coords[2];

  // Adjust height based on focus
  if (cameraFocus === 'head') {
    cameraHeight += 0.65;
  } else if (cameraFocus === 'legs') {
    cameraHeight -= 0.5;
  } else {
    cameraHeight += 0.2;
  }

  // Calculate camera position
  const cameraCoords = {
    x: coords[0] + Math.sin(angleRad) * cameraZoom,
    y: coords[1] + Math.cos(angleRad) * cameraZoom,
    z: cameraHeight,
  };

  // Calculate the direct vector from camera to ped
  const dirVector = {
    x: coords[0] - cameraCoords.x,
    y: coords[1] - cameraCoords.y,
    z: cameraHeight - cameraCoords.z,
  };

  const pitch =
    Math.atan2(dirVector.z, Math.sqrt(dirVector.x ** 2 + dirVector.y ** 2)) *
    (180 / Math.PI);
  let yaw = Math.atan2(dirVector.x, dirVector.y) * (180 / Math.PI);

  // Add our left-looking offset
  const leftAngleOffset = 30;
  yaw += leftAngleOffset;

  // Create or update the camera
  if (!characterCreationCamera) {
    const camera = CreateCam('DEFAULT_SCRIPTED_CAMERA', true);
    SetCamCoord(camera, cameraCoords.x, cameraCoords.y, cameraCoords.z);
    SetCamRot(camera, pitch, 0.0, yaw, 2);
    SetCamActive(camera, true);
    RenderScriptCams(true, false, 0, true, true);
    characterCreationCamera = camera;
  } else {
    SetCamCoord(
      characterCreationCamera,
      cameraCoords.x,
      cameraCoords.y,
      cameraCoords.z
    );
    SetCamRot(characterCreationCamera, pitch, 0.0, yaw, 2);
  }
}

/**
 * Rotate the camera around the player
 * @param {CameraDirection} direction - The direction to rotate ('left' or 'right')
 */
function rotateCamera(direction: CameraDirection): void {
  if (direction === 'left') {
    cameraRotation = (cameraRotation - 15) % 360;
  } else if (direction === 'right') {
    cameraRotation = (cameraRotation + 15) % 360;
  }

  updateCameraPosition();
}

/**
 * Zoom the camera in or out
 * @param {ZoomDirection} direction - The direction to zoom ('in' or 'out')
 */
function zoomCamera(direction: ZoomDirection): void {
  if (direction === 'in') {
    cameraZoom = Math.max(0.5, cameraZoom - 0.25);
  } else if (direction === 'out') {
    cameraZoom = Math.min(3.0, cameraZoom + 0.25);
  }

  updateCameraPosition();
}

/**
 * Focus the camera on a specific part of the player
 * @param {CameraFocus} focus - The part to focus on ('head', 'body', or 'legs')
 */
function focusCamera(focus: CameraFocus): void {
  cameraFocus = focus;
  updateCameraPosition();
}

/**
 * Clean up the character creation environment
 */
function cleanupCharacterCreation(): void {
  // Disable spectator mode
  NetworkSetInSpectatorMode(false, PlayerPedId());

  // Destroy the camera
  if (characterCreationCamera) {
    SetCamActive(characterCreationCamera, false);
    DestroyCam(characterCreationCamera, true);
    RenderScriptCams(false, false, 0, true, true);
    characterCreationCamera = null;
  }
}

/**
 * Update the player model
 * @param {string} model - The model to set
 */
async function updateModel(model: string): Promise<void> {
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
function updateFace(key: keyof FaceData, value: number): void {
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
function updateHair(key: keyof HairData, value: number): void {
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
function updateAppearance(
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
function updateClothing(key: keyof ClothingData, value: number): void {
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

/**
 * Helper function to create a delay
 * @param {number} ms - The number of milliseconds to delay
 * @returns {Promise<void>}
 */
function Delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Register a command that can be triggered by key binding
RegisterCommand(COMMAND_NAME, () => toggleUI(!uiVisible), false);

// Register key mapping (F3 key)
RegisterKeyMapping(
  COMMAND_NAME,
  'Toggle Character Creation UI',
  'keyboard',
  'F3'
);

// NUI Callbacks

// Handle NUI callback when UI is closed from the interface
RegisterNuiCallback(NUI_EVENT, ((
  data: SaveCharacterData,
  cb: (data: any) => void
) => {
  console.log(
    '[Character Create] Received NUI event with data:',
    JSON.stringify(data)
  );

  if (data.close) {
    console.log('[Character Create] Closing UI from NUI request');
    toggleUI(false);
  }

  // If saving character data
  if (data.save && data.characterData) {
    console.log(
      '[Character Create] Saving character data:',
      JSON.stringify(data.characterData)
    );
    // Save character data to server
    emitNet('character-create:save', data.characterData);
  }

  // Send response back to NUI
  cb({ status: 'ok' });
}) as NuiCallback<SaveCharacterData>);

// Handle model update
RegisterNuiCallback('character-create:update-model', (async (
  data: ModelUpdateData,
  cb: (data: any) => void
) => {
  console.log('[Character Create] Update model request:', JSON.stringify(data));
  await updateModel(data.model);
  cb({ status: 'ok' });
}) as NuiCallback<ModelUpdateData>);

// Handle face update
RegisterNuiCallback('character-create:update-face', ((
  data: FaceUpdateData,
  cb: (data: any) => void
) => {
  console.log('[Character Create] Update face request:', JSON.stringify(data));
  updateFace(data.key, data.value);
  cb({ status: 'ok' });
}) as NuiCallback<FaceUpdateData>);

// Handle hair update
RegisterNuiCallback('character-create:update-hair', ((
  data: HairUpdateData,
  cb: (data: any) => void
) => {
  console.log('[Character Create] Update hair request:', JSON.stringify(data));
  updateHair(data.key, data.value);
  cb({ status: 'ok' });
}) as NuiCallback<HairUpdateData>);

// Handle appearance update
RegisterNuiCallback('character-create:update-appearance', ((
  data: AppearanceUpdateData,
  cb: (data: any) => void
) => {
  console.log(
    '[Character Create] Update appearance request:',
    JSON.stringify(data)
  );
  updateAppearance(data.category, data.key, data.value);
  cb({ status: 'ok' });
}) as NuiCallback<AppearanceUpdateData>);

// Handle clothing update
RegisterNuiCallback('character-create:update-clothing', ((
  data: ClothingUpdateData,
  cb: (data: any) => void
) => {
  console.log(
    '[Character Create] Update clothing request:',
    JSON.stringify(data)
  );
  updateClothing(data.key, data.value);
  cb({ status: 'ok' });
}) as NuiCallback<ClothingUpdateData>);

// Handle camera rotation
RegisterNuiCallback('character-create:rotate-camera', ((
  data: CameraRotationData,
  cb: (data: any) => void
) => {
  console.log(
    '[Character Create] Camera rotation request:',
    JSON.stringify(data)
  );
  rotateCamera(data.direction);
  cb({ status: 'ok' });
}) as NuiCallback<CameraRotationData>);

// Handle camera zoom
RegisterNuiCallback('character-create:zoom-camera', ((
  data: CameraZoomData,
  cb: (data: any) => void
) => {
  console.log('[Character Create] Camera zoom request:', JSON.stringify(data));
  zoomCamera(data.direction);
  cb({ status: 'ok' });
}) as NuiCallback<CameraZoomData>);

// Handle camera focus
RegisterNuiCallback('character-create:focus-camera', ((
  data: CameraFocusData,
  cb: (data: any) => void
) => {
  console.log('[Character Create] Camera focus request:', JSON.stringify(data));
  focusCamera(data.focus);
  cb({ status: 'ok' });
}) as NuiCallback<CameraFocusData>);

// Handle save result from server
onNet(
  'character-create:save-result',
  (result: { success: boolean; error?: string }) => {
    console.log(
      '[Character Create] Save result from server:',
      JSON.stringify(result)
    );

    if (result.success) {
      console.log('[Character Create] Character saved successfully');
      // You could add additional logic here, like teleporting the player to a spawn point
    } else {
      console.error(
        '[Character Create] Failed to save character:',
        result.error
      );
    }
  }
);

// Initialize UI as hidden on resource start
AddEventHandler('onClientResourceStart', (resourceName: string) => {
  if (resourceName === GetCurrentResourceName()) {
    console.log('[Character Create] Resource started');

    // Initialize UI as hidden
    toggleUI(false);

    // Pre-load character models to ensure they're available when needed
    const maleModel = 'mp_m_freemode_01';
    const femaleModel = 'mp_f_freemode_01';

    console.log('[Character Create] Pre-loading character models');
    RequestModel(GetHashKey(maleModel));
    RequestModel(GetHashKey(femaleModel));

    // Auto-open character creation for new players
    setTimeout(() => {
      console.log('[Character Create] Auto-opening character creation UI');
      toggleUI(true);
    }, 2000);
  }
});

// Add a basic log on script load
console.log('Character creation client script loaded! F3 key will toggle UI');
