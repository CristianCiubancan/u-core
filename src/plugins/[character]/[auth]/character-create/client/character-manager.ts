import {
  FaceData,
  HairData,
  AppearanceData,
  ClothingData,
  DEFAULT_CHARACTER,
  DEFAULT_FEMALE_CHARACTER,
} from '../shared/types';
import { getCharacterData, getCameraState, store } from '../shared/store';
import { Delay } from './utils';

/**
 * Character Manager for handling all character customization
 */
class CharacterManager {
  /**
   * Load and set the player model
   * @param {string} model - The model to set
   */
  async loadAndSetModel(model: string): Promise<boolean> {
    console.log(`[Character Create] Loading and setting model: ${model}`);

    // Determine which default character data to use based on the model
    const defaultData =
      model === 'mp_f_freemode_01'
        ? DEFAULT_FEMALE_CHARACTER
        : DEFAULT_CHARACTER;

    // Update our character data with the appropriate default, but keep the model
    store.updateCharacterData({
      ...defaultData,
      model,
    });

    // Request the model
    const modelHash = GetHashKey(model);
    RequestModel(modelHash);

    // Wait for the model to load with improved timeout handling
    let modelLoaded = false;
    let attempts = 0;
    const maxAttempts = 10; // More attempts with shorter intervals

    while (!modelLoaded && attempts < maxAttempts) {
      if (HasModelLoaded(modelHash)) {
        modelLoaded = true;
      } else {
        attempts++;
        console.log(
          `[Character Create] Waiting for model to load (attempt ${attempts}/${maxAttempts})`
        );
        await Delay(500); // Shorter delay between checks
      }
    }

    if (!modelLoaded) {
      console.error(`[Character Create] Failed to load model: ${model}`);
      return false;
    }

    // Set the player model
    SetPlayerModel(PlayerId(), modelHash);
    SetModelAsNoLongerNeeded(modelHash);

    // Force entity to be visible
    const playerPed = PlayerPedId();
    SetEntityVisible(playerPed, true, false);

    // Reset appearance after model change
    SetPedDefaultComponentVariation(playerPed);
    ClearAllPedProps(playerPed);

    console.log(
      `[Character Create] Model ${model} loaded and applied successfully`
    );
    return true;
  }

  /**
   * Apply all character customizations in the correct sequence
   * This ensures consistency across all updates
   */
  applyFullCharacterData(): void {
    const characterData = getCharacterData();
    const playerPed = PlayerPedId();

    // Ensure player is visible
    SetEntityVisible(playerPed, true, false);

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

    // Apply appearance overlays
    this.applyAppearanceOverlays(characterData.appearance);

    // Apply clothing
    this.applyClothing(characterData.clothing);

    // Apply props if they exist
    if (characterData.props) {
      this.applyProps(characterData.props);
    }

    console.log('[Character Create] Full character data applied successfully');
  }

  /**
   * Apply appearance overlays (facial features)
   * @param {AppearanceData} appearance - The appearance data to apply
   */
  private applyAppearanceOverlays(appearance: AppearanceData): void {
    const playerPed = PlayerPedId();

    // Apply eye color
    SetPedEyeColor(playerPed, appearance.eyeColor);

    // Apply eyebrows
    SetPedHeadOverlay(
      playerPed,
      2, // Eyebrows
      appearance.eyebrows.style,
      appearance.eyebrows.opacity || 1.0
    );
    SetPedHeadOverlayColor(
      playerPed,
      2, // Eyebrows
      1, // Color type (1 for hair color)
      appearance.eyebrows.color || 0,
      appearance.eyebrows.color || 0
    );

    // Apply beard
    SetPedHeadOverlay(
      playerPed,
      1, // Beard
      appearance.beard.style,
      appearance.beard.opacity || 1.0
    );
    SetPedHeadOverlayColor(
      playerPed,
      1, // Beard
      1, // Color type (1 for hair color)
      appearance.beard.color || 0,
      appearance.beard.color || 0
    );

    // Apply other overlays if they exist
    if (appearance.blemishes) {
      SetPedHeadOverlay(
        playerPed,
        0, // Blemishes
        appearance.blemishes.style,
        appearance.blemishes.opacity
      );
    }

    if (appearance.ageing) {
      SetPedHeadOverlay(
        playerPed,
        3, // Ageing
        appearance.ageing.style,
        appearance.ageing.opacity
      );
    }

    if (appearance.complexion) {
      SetPedHeadOverlay(
        playerPed,
        6, // Complexion
        appearance.complexion.style,
        appearance.complexion.opacity
      );
    }

    if (appearance.moles) {
      SetPedHeadOverlay(
        playerPed,
        9, // Moles/Freckles
        appearance.moles.style,
        appearance.moles.opacity
      );
    }

    if (appearance.sunDamage) {
      SetPedHeadOverlay(
        playerPed,
        7, // Sun Damage
        appearance.sunDamage.style,
        appearance.sunDamage.opacity
      );
    }

    if (appearance.makeUp) {
      SetPedHeadOverlay(
        playerPed,
        4, // Makeup
        appearance.makeUp.style,
        appearance.makeUp.opacity
      );
      if (appearance.makeUp.color !== undefined) {
        SetPedHeadOverlayColor(
          playerPed,
          4, // Makeup
          2, // Color type (2 for makeup)
          appearance.makeUp.color,
          appearance.makeUp.color
        );
      }
    }

    if (appearance.lipstick) {
      SetPedHeadOverlay(
        playerPed,
        8, // Lipstick
        appearance.lipstick.style,
        appearance.lipstick.opacity
      );
      if (appearance.lipstick.color !== undefined) {
        SetPedHeadOverlayColor(
          playerPed,
          8, // Lipstick
          2, // Color type (2 for makeup)
          appearance.lipstick.color,
          appearance.lipstick.color
        );
      }
    }
  }

  /**
   * Apply clothing to the character
   * @param {ClothingData} clothing - The clothing data to apply
   */
  private applyClothing(clothing: ClothingData): void {
    const playerPed = PlayerPedId();

    // Apply torso
    SetPedComponentVariation(
      playerPed,
      3,
      clothing.torso,
      clothing.torsoTexture,
      0
    );

    // Apply legs
    SetPedComponentVariation(
      playerPed,
      4,
      clothing.legs,
      clothing.legsTexture,
      0
    );

    // Apply shoes
    SetPedComponentVariation(
      playerPed,
      6,
      clothing.shoes,
      clothing.shoesTexture,
      0
    );

    // Apply accessories
    SetPedComponentVariation(
      playerPed,
      7,
      clothing.accessories,
      clothing.accessoriesTexture,
      0
    );

    // Apply undershirt
    SetPedComponentVariation(
      playerPed,
      8,
      clothing.undershirt,
      clothing.undershirtTexture,
      0
    );

    // Apply tops
    SetPedComponentVariation(
      playerPed,
      11,
      clothing.tops,
      clothing.topsTexture,
      0
    );

    // Apply optional clothing if they exist
    if (clothing.mask !== undefined) {
      SetPedComponentVariation(
        playerPed,
        1,
        clothing.mask,
        clothing.maskTexture || 0,
        0
      );
    }

    if (clothing.bags !== undefined) {
      SetPedComponentVariation(
        playerPed,
        5,
        clothing.bags,
        clothing.bagsTexture || 0,
        0
      );
    }

    if (clothing.armor !== undefined) {
      SetPedComponentVariation(
        playerPed,
        9,
        clothing.armor,
        clothing.armorTexture || 0,
        0
      );
    }

    if (clothing.decals !== undefined) {
      SetPedComponentVariation(
        playerPed,
        10,
        clothing.decals,
        clothing.decalsTexture || 0,
        0
      );
    }
  }

  /**
   * Apply props (accessories) to the character
   * @param {PropData} props - The props data to apply
   */
  private applyProps(props: any): void {
    const playerPed = PlayerPedId();

    // Apply hat
    if (props.hat !== undefined) {
      SetPedPropIndex(playerPed, 0, props.hat, props.hatTexture || 0, true);
    }

    // Apply glasses
    if (props.glasses !== undefined) {
      SetPedPropIndex(
        playerPed,
        1,
        props.glasses,
        props.glassesTexture || 0,
        true
      );
    }

    // Apply ears
    if (props.ears !== undefined) {
      SetPedPropIndex(playerPed, 2, props.ears, props.earsTexture || 0, true);
    }

    // Apply watches
    if (props.watches !== undefined) {
      SetPedPropIndex(
        playerPed,
        6,
        props.watches,
        props.watchesTexture || 0,
        true
      );
    }

    // Apply bracelets
    if (props.bracelets !== undefined) {
      SetPedPropIndex(
        playerPed,
        7,
        props.bracelets,
        props.braceletsTexture || 0,
        true
      );
    }
  }

  /**
   * Update the player model
   * @param {string} model - The model to set
   */
  async updateModel(model: string): Promise<void> {
    console.log(`[Character Create] Updating player model to: ${model}`);

    // Update the model with the appropriate default character data
    await this.loadAndSetModel(model);

    // After model is changed, we need to reapply all customizations
    this.applyFullCharacterData();

    // Make sure the character is facing the camera after model change
    this.faceCamera();
  }

  /**
   * Update face data
   * @param {keyof FaceData} key - The face property to update
   * @param {number} value - The new value
   */
  updateFace(key: keyof FaceData, value: number): void {
    console.log(`[Character Create] Updating face ${key} to ${value}`);

    // Update our character data
    store.updateCharacterProperty('face', { [key]: value });

    // Apply the update
    this.applyFullCharacterData();
  }

  /**
   * Update hair data
   * @param {keyof HairData} key - The hair property to update
   * @param {number} value - The new value
   */
  updateHair(key: keyof HairData, value: number): void {
    console.log(`[Character Create] Updating hair ${key} to ${value}`);

    // Update our character data
    store.updateCharacterProperty('hair', { [key]: value });

    // Apply the update
    const playerPed = PlayerPedId();
    const characterData = getCharacterData();

    if (key === 'style') {
      SetPedComponentVariation(playerPed, 2, value, 0, 0);
    } else {
      SetPedHairColor(
        playerPed,
        characterData.hair.color,
        characterData.hair.highlight
      );
    }
  }

  /**
   * Update appearance data
   * @param {keyof AppearanceData} category - The appearance category to update
   * @param {string} key - The specific property to update
   * @param {number} value - The new value
   */
  updateAppearance(
    category: keyof AppearanceData,
    key: string,
    value: number
  ): void {
    console.log(
      `[Character Create] Updating appearance ${category}.${key} to ${value}`
    );

    // Get current appearance data
    const characterData = getCharacterData();
    const currentAppearance = characterData.appearance;

    // Create updated appearance data
    let updatedCategory: any;

    if (typeof currentAppearance[category] === 'number') {
      // Handle simple number properties like eyeColor
      store.updateCharacterProperty('appearance', { [category]: value });
    } else {
      // Handle complex properties like eyebrows, beard, etc.
      updatedCategory = {
        ...currentAppearance[category],
        [key]: value,
      };
      store.updateCharacterProperty('appearance', {
        [category]: updatedCategory,
      });
    }

    // Apply the update
    this.applyAppearanceOverlays(getCharacterData().appearance);
  }

  /**
   * Update clothing data
   * @param {keyof ClothingData} key - The clothing property to update
   * @param {number} value - The new value
   */
  updateClothing(key: keyof ClothingData, value: number): void {
    console.log(`[Character Create] Updating clothing ${key} to ${value}`);

    // Update our character data
    store.updateCharacterProperty('clothing', { [key]: value });

    // Apply the update
    this.applyClothing(getCharacterData().clothing);
  }

  /**
   * Rotate the player character
   * @param {string} direction - The direction to rotate ('left' or 'right')
   */
  rotatePlayer(direction: 'left' | 'right'): void {
    console.log(`[Character Create] Rotating player: ${direction}`);

    const playerPed = PlayerPedId();
    const currentHeading = GetEntityHeading(playerPed);
    let newHeading = currentHeading;

    // Rotate by 15 degrees in the specified direction
    if (direction === 'left') {
      newHeading = (currentHeading - 15) % 360;
    } else if (direction === 'right') {
      newHeading = (currentHeading + 15) % 360;
    }

    // Set the new heading
    SetEntityHeading(playerPed, newHeading);
  }

  /**
   * Make the player face the camera
   * This ensures the character is always looking at the camera when the menu is opened
   */
  faceCamera(): void {
    console.log('[Character Create] Making player face the camera');

    const playerPed = PlayerPedId();

    // Get camera position from the store
    const { cameraRotation } = getCameraState();

    // Calculate the angle that makes the player face the camera
    // We add 180 degrees to make the player face directly at the camera
    // The camera rotation is the angle around the player, so we need to invert it
    const faceAngle = cameraRotation % 360;

    console.log(
      `[Character Create] Setting player heading to ${faceAngle} degrees`
    );

    // Set the player's heading to face the camera
    SetEntityHeading(playerPed, faceAngle);
  }
}

// Export a singleton instance
export const characterManager = new CharacterManager();

// Export compatibility functions for existing code
export const loadAndSetModel = (model: string) =>
  characterManager.loadAndSetModel(model);
export const applyFullCharacterData = () =>
  characterManager.applyFullCharacterData();
export const updateModel = (model: string) =>
  characterManager.updateModel(model);
export const updateFace = (key: keyof FaceData, value: number) =>
  characterManager.updateFace(key, value);
export const updateHair = (key: keyof HairData, value: number) =>
  characterManager.updateHair(key, value);
export const updateAppearance = (
  category: keyof AppearanceData,
  key: string,
  value: number
) => characterManager.updateAppearance(category, key, value);
export const updateClothing = (key: keyof ClothingData, value: number) =>
  characterManager.updateClothing(key, value);
export const rotatePlayer = (direction: 'left' | 'right') =>
  characterManager.rotatePlayer(direction);
export const faceCamera = () => characterManager.faceCamera();
