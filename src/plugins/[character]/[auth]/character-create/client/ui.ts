/// <reference types="@citizenfx/client" />

import { characterData, setUiVisible } from './state';
import { setupCamera, cleanupCamera } from './camera';
import { loadAndSetModel, applyFullCharacterData } from './character';

// Constants
const NUI_EVENT = 'character-create:toggle-ui';

/**
 * =======================================================
 * UI MANAGEMENT
 * =======================================================
 */

/**
 * Toggle UI visibility
 * @param {boolean} state - The state to set the UI to (true = visible, false = hidden)
 */
export function toggleUI(state: boolean): void {
  console.log(
    `[Character Create] Toggling UI to ${state ? 'visible' : 'hidden'}`
  );
  setUiVisible(state); // Update state

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
 * Clean up the character creation environment
 */
function cleanupCharacterCreation(): void {
  cleanupCamera();
}
