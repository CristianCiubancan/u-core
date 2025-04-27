/// <reference types="@citizenfx/client" />

// Wrap everything in a namespace to avoid conflicts with other plugins
namespace CharacterCreate {
  // Constants
  const NUI_EVENT = 'character-create:toggle-ui';
  const COMMAND_NAME = 'character-create:toggle_ui';

  // Variable to track UI state
  let uiVisible = false;

  // Camera variables
  let cameraRotation = 0;
  let cameraZoom = 1.5;
  let cameraFocus = 'body'; // 'head', 'body', 'legs'

  // Store camera handle
  let characterCreationCamera: number | null = null;

  /**
   * Toggle UI visibility
   * @param {boolean} state - The state to set the UI to (true = visible, false = hidden)
   */
  function toggleUI(state: boolean) {
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
  async function setupCharacterCreation() {
    console.log('[Character Create] Setting up character creation environment');

    // Always ensure we have a valid character model when opening the UI
    // Create a default character model
    const isMale = Math.random() > 0.5;
    const model = isMale ? 'mp_m_freemode_01' : 'mp_f_freemode_01';

    console.log(`[Character Create] Loading model: ${model}`);

    // Request the model
    RequestModel(GetHashKey(model));

    // Wait for the model to load with improved timeout handling
    const startTime = GetGameTimer();
    let modelLoaded = false;

    while (!modelLoaded) {
      if (HasModelLoaded(GetHashKey(model))) {
        modelLoaded = true;
        console.log(`[Character Create] Model loaded successfully: ${model}`);
        break;
      }

      await Delay(100);

      // Timeout after 10 seconds (increased from 5)
      if (GetGameTimer() - startTime > 10000) {
        console.error(
          `[Character Create] Failed to load character model: ${model}`
        );
        // Try one more time with a different approach
        RequestModel(GetHashKey(model));
        await Delay(1000);
        if (HasModelLoaded(GetHashKey(model))) {
          modelLoaded = true;
          console.log(
            `[Character Create] Model loaded on second attempt: ${model}`
          );
        } else {
          console.error(
            `[Character Create] Model loading failed after retry: ${model}`
          );
          break;
        }
      }
    }

    // Set the player model
    SetPlayerModel(PlayerId(), GetHashKey(model));
    SetModelAsNoLongerNeeded(GetHashKey(model));

    // Set default appearance with improved error handling
    try {
      const playerPed = PlayerPedId();

      // Ensure the ped exists and is valid
      if (DoesEntityExist(playerPed)) {
        console.log(
          `[Character Create] Setting default appearance for ped: ${playerPed}`
        );

        // Set default component variations
        SetPedDefaultComponentVariation(playerPed);

        // Clear all props
        ClearAllPedProps(playerPed);

        // Ensure the character is visible
        SetEntityVisible(playerPed, true, false);

        // Set player heading to face forward (0.0 is north/forward)
        SetEntityHeading(playerPed, 0.0);

        // Apply some default clothing to ensure character is visible
        SetPedComponentVariation(playerPed, 11, 0, 0, 0); // Tops
        SetPedComponentVariation(playerPed, 8, 0, 0, 0); // Undershirt
        SetPedComponentVariation(playerPed, 4, 0, 0, 0); // Legs
        SetPedComponentVariation(playerPed, 6, 0, 0, 0); // Shoes

        console.log('[Character Create] Default appearance set successfully');
      } else {
        console.error('[Character Create] Failed to get valid player ped');
      }
    } catch (error) {
      console.error(
        '[Character Create] Error setting default appearance:',
        error
      );
    }

    // Set up camera
    setupCamera();
  }

  /**
   * Set up the camera for character creation
   */
  function setupCamera() {
    // Disable rendering of the player's camera while in character creation
    NetworkSetInSpectatorMode(true, PlayerPedId());

    // Create a camera pointing at the player
    updateCameraPosition();
  }

  /**
   * Update the camera position based on current rotation, zoom, and focus
   */
  function updateCameraPosition() {
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

    // Calculate camera position (this stays the same)
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

    // Add our left-looking offset (adjust this value as needed)
    const leftAngleOffset = 30;
    yaw += leftAngleOffset;

    // Create or update the camera
    if (!characterCreationCamera) {
      const camera = CreateCam('DEFAULT_SCRIPTED_CAMERA', true);
      SetCamCoord(camera, cameraCoords.x, cameraCoords.y, cameraCoords.z);

      // Use our calculated rotation with the offset
      SetCamRot(camera, pitch, 0.0, yaw, 2);

      SetCamActive(camera, true);
      RenderScriptCams(true, false, 0, true, true);

      // Store the camera handle for later cleanup
      characterCreationCamera = camera;
    } else {
      SetCamCoord(
        characterCreationCamera,
        cameraCoords.x,
        cameraCoords.y,
        cameraCoords.z
      );

      // Use our calculated rotation with the offset
      SetCamRot(characterCreationCamera, pitch, 0.0, yaw, 2);
    }
  }

  /**
   * Rotate the camera around the player
   * @param {string} direction - The direction to rotate ('left' or 'right')
   */
  function rotateCamera(direction: string) {
    if (direction === 'left') {
      cameraRotation = (cameraRotation - 15) % 360;
    } else if (direction === 'right') {
      cameraRotation = (cameraRotation + 15) % 360;
    }

    updateCameraPosition();
  }

  /**
   * Zoom the camera in or out
   * @param {string} direction - The direction to zoom ('in' or 'out')
   */
  function zoomCamera(direction: string) {
    if (direction === 'in') {
      cameraZoom = Math.max(0.5, cameraZoom - 0.25);
    } else if (direction === 'out') {
      cameraZoom = Math.min(3.0, cameraZoom + 0.25);
    }

    updateCameraPosition();
  }

  /**
   * Focus the camera on a specific part of the player
   * @param {string} focus - The part to focus on ('head', 'body', or 'legs')
   */
  function focusCamera(focus: string) {
    cameraFocus = focus;
    updateCameraPosition();
  }

  /**
   * Clean up the character creation environment
   */
  function cleanupCharacterCreation() {
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
  async function updateModel(model: string) {
    // Request the model
    RequestModel(GetHashKey(model));

    // Wait for the model to load
    const startTime = GetGameTimer();
    while (!HasModelLoaded(GetHashKey(model))) {
      await Delay(100);

      // Timeout after 5 seconds
      if (GetGameTimer() - startTime > 5000) {
        console.error('Failed to load character model');
        return;
      }
    }

    // Set the player model
    SetPlayerModel(PlayerId(), GetHashKey(model));
    SetModelAsNoLongerNeeded(GetHashKey(model));

    // Set default appearance
    const playerPed = PlayerPedId();
    SetPedDefaultComponentVariation(playerPed);
    ClearAllPedProps(playerPed);

    // Ensure player is still facing forward after model change
    SetEntityHeading(playerPed, 0.0);
  }

  /**
   * Update the player's face
   * @param {string} key - The face property to update
   * @param {number} value - The value to set
   */
  function updateFace(key: string, value: number) {
    const playerPed = PlayerPedId();

    if (
      key === 'fatherIndex' ||
      key === 'motherIndex' ||
      key === 'shapeMix' ||
      key === 'skinMix'
    ) {
      // Get current values
      const fatherIndex = key === 'fatherIndex' ? value : 0; // Default value, should be from state
      const motherIndex = key === 'motherIndex' ? value : 0; // Default value, should be from state
      const shapeMix = key === 'shapeMix' ? value : 0.5; // Default value, should be from state
      const skinMix = key === 'skinMix' ? value : 0.5; // Default value, should be from state

      // Set head blend
      SetPedHeadBlendData(
        playerPed,
        fatherIndex,
        motherIndex,
        0, // Parent 3 (unused)
        fatherIndex,
        motherIndex,
        0, // Parent 3 (unused)
        shapeMix,
        skinMix,
        0.0, // Parent 3 mix (unused)
        false // Is parent inheritance
      );
    }

    // Ensure player is still facing forward
    SetEntityHeading(playerPed, 0.0);
  }

  /**
   * Update the player's hair
   * @param {string} key - The hair property to update
   * @param {number} value - The value to set
   */
  function updateHair(key: string, value: number) {
    const playerPed = PlayerPedId();

    if (key === 'style') {
      SetPedComponentVariation(playerPed, 2, value, 0, 0);
    } else if (key === 'color' || key === 'highlight') {
      const colorId = key === 'color' ? value : 0; // Default value, should be from state
      const highlightId = key === 'highlight' ? value : 0; // Default value, should be from state

      SetPedHairColor(playerPed, colorId, highlightId);
    }

    // Ensure player is still facing forward
    SetEntityHeading(playerPed, 0.0);
  }

  /**
   * Update the player's appearance
   * @param {string} category - The appearance category to update
   * @param {string} key - The appearance property to update
   * @param {number} value - The value to set
   */
  function updateAppearance(category: string, key: string, value: number) {
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

    // Ensure player is still facing forward
    SetEntityHeading(playerPed, 0.0);
  }

  /**
   * Update the player's clothing
   * @param {string} key - The clothing property to update
   * @param {number} value - The value to set
   */
  function updateClothing(key: string, value: number) {
    try {
      const playerPed = PlayerPedId();

      // Ensure the ped exists and is valid
      if (!DoesEntityExist(playerPed)) {
        console.error(
          '[Character Create] Failed to get valid player ped for clothing update'
        );
        return;
      }

      console.log(`[Character Create] Updating clothing: ${key} = ${value}`);

      // Component IDs:
      // 0: Face
      // 1: Mask
      // 2: Hair
      // 3: Torso
      // 4: Legs
      // 5: Bags/Parachute
      // 6: Shoes
      // 7: Accessories
      // 8: Undershirt
      // 9: Body Armor
      // 10: Decals
      // 11: Tops

      // Map clothing keys to component IDs
      const componentMap: Record<string, number> = {
        'tops': 11,
        'torso': 3,
        'undershirt': 8,
        'legs': 4,
        'shoes': 6,
        'accessories': 7,
      };

      // Handle style changes (drawable IDs)
      if (Object.keys(componentMap).includes(key)) {
        const componentId = componentMap[key];
        SetPedComponentVariation(playerPed, componentId, value, 0, 0);
        console.log(
          `[Character Create] Set component ${componentId} to drawable ${value}`
        );
      }
      // Handle texture changes
      else if (key.endsWith('Texture')) {
        const baseKey = key.replace('Texture', '');
        if (Object.keys(componentMap).includes(baseKey)) {
          const componentId = componentMap[baseKey];
          const drawableId = GetPedDrawableVariation(playerPed, componentId);
          SetPedComponentVariation(
            playerPed,
            componentId,
            drawableId,
            value,
            0
          );
          console.log(
            `[Character Create] Set component ${componentId} texture to ${value}`
          );
        }
      }

      // Ensure the character is visible
      SetEntityVisible(playerPed, true, false);

      // Ensure player is still facing forward
      SetEntityHeading(playerPed, 0.0);
    } catch (error) {
      console.error('[Character Create] Error updating clothing:', error);
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

  // Handle NUI callback when UI is closed from the interface
  RegisterNuiCallback(NUI_EVENT, (data: any, cb: (data: any) => void) => {
    if (data.close) {
      toggleUI(false);
    }

    // If saving character data
    if (data.save) {
      // Save character data to server
      emitNet('character-create:save', data.characterData);
    }

    // Send response back to NUI
    cb({ status: 'ok' });
  });

  // Handle model update
  RegisterNuiCallback(
    'character-create:update-model',
    async (data: any, cb: (data: any) => void) => {
      await updateModel(data.model);
      cb({ status: 'ok' });
    }
  );

  // Handle face update
  RegisterNuiCallback(
    'character-create:update-face',
    (data: any, cb: (data: any) => void) => {
      updateFace(data.key, data.value);
      cb({ status: 'ok' });
    }
  );

  // Handle hair update
  RegisterNuiCallback(
    'character-create:update-hair',
    (data: any, cb: (data: any) => void) => {
      updateHair(data.key, data.value);
      cb({ status: 'ok' });
    }
  );

  // Handle appearance update
  RegisterNuiCallback(
    'character-create:update-appearance',
    (data: any, cb: (data: any) => void) => {
      updateAppearance(data.category, data.key, data.value);
      cb({ status: 'ok' });
    }
  );

  // Handle clothing update
  RegisterNuiCallback(
    'character-create:update-clothing',
    (data: any, cb: (data: any) => void) => {
      updateClothing(data.key, data.value);
      cb({ status: 'ok' });
    }
  );

  // Handle camera rotation
  RegisterNuiCallback(
    'character-create:rotate-camera',
    (data: any, cb: (data: any) => void) => {
      rotateCamera(data.direction);
      cb({ status: 'ok' });
    }
  );

  // Handle camera zoom
  RegisterNuiCallback(
    'character-create:zoom-camera',
    (data: any, cb: (data: any) => void) => {
      zoomCamera(data.direction);
      cb({ status: 'ok' });
    }
  );

  // Handle camera focus
  RegisterNuiCallback(
    'character-create:focus-camera',
    (data: any, cb: (data: any) => void) => {
      focusCamera(data.focus);
      cb({ status: 'ok' });
    }
  );

  // Handle save result from server
  onNet('character-create:save-result', (result: any) => {
    if (result.success) {
      console.log('Character saved successfully');
      // You could add additional logic here, like teleporting the player to a spawn point
    } else {
      console.error('Failed to save character:', result.error);
    }
  });

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

      // Auto-open character creation for new players with a slightly longer delay
      // This would typically be controlled by the server based on whether the player has a character
      // For demo purposes, we'll just open it automatically
      setTimeout(() => {
        console.log('[Character Create] Auto-opening character creation UI');
        toggleUI(true);
      }, 2000); // Increased from 1000ms to 2000ms to ensure models have time to load
    }
  });

  // Add a basic log on script load
  console.log('Character creation client script loaded! F3 key will toggle UI');
}
