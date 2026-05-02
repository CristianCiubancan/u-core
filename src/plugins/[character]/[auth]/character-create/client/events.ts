/// <reference types="@citizenfx/client" />

import {
  NuiCallbackMap,
  NUI_EVENT,
  NuiResponse,
} from '../shared/types';
import {
  validateToggleUi,
  validateModelUpdate,
  validateFaceUpdate,
  validateHairUpdate,
  validateAppearanceUpdate,
  validateClothingUpdate,
  validateCameraRotation,
  validateCameraZoom,
  validateCameraFocus,
  validatePlayerRotation,
  validateCameraDrag,
  validateDragEnd,
  formatValidationErrors,
} from '../shared/validators';
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
import {
  rotateCamera,
  zoomCamera,
  focusCamera,
  zoomCameraByAmount,
} from './camera';
import type { ValidateFunction } from 'ajv';

// Constants
const COMMAND_NAME = 'character-create:toggle_ui';

/**
 * Typed bridge for `RegisterNuiCallback`. Action strings are constrained to
 * keys of `NuiCallbackMap`; the request and response payloads are inferred
 * from that map. Replaces the previous handler-cast pattern, which was
 * additive — it told the type checker about the data type but left `cb`
 * typed as an unconstrained callback, so a wrong status shape silently
 * type-checked.
 */
function registerNuiCallback<K extends keyof NuiCallbackMap>(
  action: K,
  handler: (
    data: NuiCallbackMap[K]['request'],
    cb: (response: NuiCallbackMap[K]['response']) => void
  ) => void | Promise<void>
): void {
  // RegisterNuiCallback is a CitizenFX native; the wrapper enforces typing
  // at the call site, while the runtime payload still arrives as plain JSON.
  RegisterNuiCallback(
    action,
    handler as (data: unknown, cb: (response: unknown) => void) => void
  );
}

/**
 * Wrap a NUI callback handler with a runtime payload validator. The NUI
 * surface is the lowest-trust boundary on the client (anyone with browser
 * devtools open in the resource UI can post arbitrary JSON), so every
 * action validates before any FiveM native is touched. Invalid payloads
 * are rejected with `{ status: 'invalid' }` and logged locally — the
 * server-side audit trail is in `server/index.ts`'s NetEvent handler.
 */
function registerValidatedNuiCallback<K extends keyof NuiCallbackMap>(
  action: K,
  validate: ValidateFunction,
  handler: (
    data: NuiCallbackMap[K]['request'],
    cb: (response: NuiCallbackMap[K]['response']) => void
  ) => void | Promise<void>
): void {
  registerNuiCallback(action, async (data, cb) => {
    if (!validate(data)) {
      const reason = formatValidationErrors(validate.errors);
      console.warn(
        `[Character Create] [audit] rejected NUI '${action}': ${reason}`
      );
      // `NuiResponse` is the union for every action's response in the map,
      // so the cast is sound: `{ status: 'invalid', ... }` is a member of
      // `NuiCallbackMap[K]['response']` for all current K.
      cb({ status: 'invalid', reason } as NuiResponse as NuiCallbackMap[K]['response']);
      return;
    }
    await handler(data, cb);
  });
}

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
  registerValidatedNuiCallback(NUI_EVENT, validateToggleUi, (data, cb) => {
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
  });

  // Handle model update
  registerValidatedNuiCallback(
    'character-create:update-model',
    validateModelUpdate,
    async (data, cb) => {
      console.log(
        '[Character Create] Update model request:',
        JSON.stringify(data)
      );
      await updateModel(data.model);
      cb({ status: 'ok' });
    }
  );

  // Handle face update
  registerValidatedNuiCallback(
    'character-create:update-face',
    validateFaceUpdate,
    (data, cb) => {
      console.log(
        '[Character Create] Update face request:',
        JSON.stringify(data)
      );
      updateFace(data.key, data.value);
      cb({ status: 'ok' });
    }
  );

  // Handle hair update
  registerValidatedNuiCallback(
    'character-create:update-hair',
    validateHairUpdate,
    (data, cb) => {
      console.log(
        '[Character Create] Update hair request:',
        JSON.stringify(data)
      );
      updateHair(data.key, data.value);
      cb({ status: 'ok' });
    }
  );

  // Handle appearance update
  registerValidatedNuiCallback(
    'character-create:update-appearance',
    validateAppearanceUpdate,
    (data, cb) => {
      console.log(
        '[Character Create] Update appearance request:',
        JSON.stringify(data)
      );
      updateAppearance(data.category, data.key, data.value);
      cb({ status: 'ok' });
    }
  );

  // Handle clothing update
  registerValidatedNuiCallback(
    'character-create:update-clothing',
    validateClothingUpdate,
    (data, cb) => {
      console.log(
        '[Character Create] Update clothing request:',
        JSON.stringify(data)
      );
      updateClothing(data.key, data.value);
      cb({ status: 'ok' });
    }
  );

  // Handle camera rotation
  registerValidatedNuiCallback(
    'character-create:rotate-camera',
    validateCameraRotation,
    (data, cb) => {
      console.log(
        '[Character Create] Camera rotation request:',
        JSON.stringify(data)
      );
      rotateCamera(data.direction);
      cb({ status: 'ok' });
    }
  );

  // Handle camera zoom
  registerValidatedNuiCallback(
    'character-create:zoom-camera',
    validateCameraZoom,
    (data, cb) => {
      console.log(
        '[Character Create] Camera zoom request:',
        JSON.stringify(data)
      );
      zoomCamera(data.direction);
      cb({ status: 'ok' });
    }
  );

  // Handle camera focus
  registerValidatedNuiCallback(
    'character-create:focus-camera',
    validateCameraFocus,
    (data, cb) => {
      console.log(
        '[Character Create] Camera focus request:',
        JSON.stringify(data)
      );
      focusCamera(data.focus);
      cb({ status: 'ok' });
    }
  );

  // Handle player rotation
  registerValidatedNuiCallback(
    'character-create:rotate-player',
    validatePlayerRotation,
    (data, cb) => {
      console.log(
        '[Character Create] Player rotation request:',
        JSON.stringify(data)
      );
      rotatePlayer(data.direction);
      cb({ status: 'ok' });
    }
  );

  // Handle camera drag (for rotation and zoom)
  registerValidatedNuiCallback(
    'character-create:drag-camera',
    validateCameraDrag,
    (data, cb) => {
      console.log(
        '[Character Create] Camera drag request:',
        JSON.stringify(data)
      );

      // Use deltaX for player rotation (not camera rotation)
      // Use deltaY for camera zoom
      const zoomAmount = data.deltaY * 0.05; // Scale down for smoother zoom

      // Apply player rotation based on deltaX
      // Determine rotation direction based on deltaX
      // Note: We invert the direction to make it feel more natural
      // When dragging right, the character should rotate right (clockwise)
      if (Math.abs(data.deltaX) > 5) {
        // Add a small threshold to prevent tiny movements
        const direction = data.deltaX > 0 ? 'right' : 'left';
        rotatePlayer(direction);
      }

      // Apply zoom based on deltaY
      if (Math.abs(zoomAmount) > 0.01) {
        zoomCameraByAmount(zoomAmount);
      }

      cb({ status: 'ok' });
    }
  );

  // Handle drag end
  registerValidatedNuiCallback(
    'character-create:drag-end',
    validateDragEnd,
    (_data, cb) => {
      console.log('[Character Create] Drag end request');
      // Nothing to do here for now, but we could stop any ongoing animations
      cb({ status: 'ok' });
    }
  );

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
