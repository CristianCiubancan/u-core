/// <reference types="@citizenfx/client" />

import {
  ModelUpdateData,
  FaceUpdateData,
  HairUpdateData,
  AppearanceUpdateData,
  ClothingUpdateData,
  CameraRotationData,
  CameraZoomData,
  CameraFocusData,
  PlayerRotationData,
  SaveCharacterData,
  NuiCallback,
  NUI_EVENT,
} from '../shared/types';
import { isUiVisible } from '../shared/store';
import { toggleUI } from './ui';
import {
  updateModel,
  updateFace,
  updateHair,
  updateAppearance,
  updateClothing,
  rotatePlayer,
} from './character-manager';
import { rotateCamera, zoomCamera, focusCamera } from './camera';

// Constants
const COMMAND_NAME = 'character-create:toggle_ui';

/**
 * =======================================================
 * NUI CALLBACKS & EVENT HANDLERS
 * =======================================================
 */

export function registerEvents(): void {
  // Register a command that can be triggered by key binding
  RegisterCommand(COMMAND_NAME, () => toggleUI(!isUiVisible()), false);

  // Register key mapping (F3 key)
  RegisterKeyMapping(
    COMMAND_NAME,
    'Toggle Character Creation UI',
    'keyboard',
    'F3'
  );

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
    console.log(
      '[Character Create] Update model request:',
      JSON.stringify(data)
    );
    await updateModel(data.model);
    cb({ status: 'ok' });
  }) as NuiCallback<ModelUpdateData>);

  // Handle face update
  RegisterNuiCallback('character-create:update-face', ((
    data: FaceUpdateData,
    cb: (data: any) => void
  ) => {
    console.log(
      '[Character Create] Update face request:',
      JSON.stringify(data)
    );
    updateFace(data.key, data.value);
    cb({ status: 'ok' });
  }) as NuiCallback<FaceUpdateData>);

  // Handle hair update
  RegisterNuiCallback('character-create:update-hair', ((
    data: HairUpdateData,
    cb: (data: any) => void
  ) => {
    console.log(
      '[Character Create] Update hair request:',
      JSON.stringify(data)
    );
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
    console.log(
      '[Character Create] Camera zoom request:',
      JSON.stringify(data)
    );
    zoomCamera(data.direction);
    cb({ status: 'ok' });
  }) as NuiCallback<CameraZoomData>);

  // Handle camera focus
  RegisterNuiCallback('character-create:focus-camera', ((
    data: CameraFocusData,
    cb: (data: any) => void
  ) => {
    console.log(
      '[Character Create] Camera focus request:',
      JSON.stringify(data)
    );
    focusCamera(data.focus);
    cb({ status: 'ok' });
  }) as NuiCallback<CameraFocusData>);

  // Handle player rotation
  RegisterNuiCallback('character-create:rotate-player', ((
    data: PlayerRotationData,
    cb: (data: any) => void
  ) => {
    console.log(
      '[Character Create] Player rotation request:',
      JSON.stringify(data)
    );
    rotatePlayer(data.direction);
    cb({ status: 'ok' });
  }) as NuiCallback<PlayerRotationData>);

  /**
   * =======================================================
   * SERVER EVENT HANDLERS
   * =======================================================
   */

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
}
