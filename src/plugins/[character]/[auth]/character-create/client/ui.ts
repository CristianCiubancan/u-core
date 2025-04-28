/// <reference types="@citizenfx/client" />

import { NUI_EVENT, getCharacterData, setUiVisible } from '../shared/store';
import { setupCamera, cleanupCamera } from './camera';
import { loadAndSetModel, applyFullCharacterData } from './character-manager';

/**
 * UI Manager for character creation
 * Handles UI visibility and setup/cleanup
 */
class UiManager {
  /**
   * Toggle UI visibility
   * @param {boolean} state - The state to set the UI to (true = visible, false = hidden)
   */
  async toggle(state: boolean): Promise<void> {
    console.log(
      `[Character Create] Toggling UI to ${state ? 'visible' : 'hidden'}`
    );

    setUiVisible(state);

    // Send message to NUI
    SendNUIMessage({
      action: NUI_EVENT,
      data: state,
    });

    // Set focus to UI when visible
    SetNuiFocus(state, state);

    // If showing UI, set up the character creation environment
    if (state) {
      await this.setup();
    } else {
      this.cleanup();
    }
  }

  /**
   * Set up the character creation environment
   */
  private async setup(): Promise<void> {
    console.log('[Character Create] Setting up character creation environment');

    // Always ensure we have a valid character model when opening the UI
    const characterData = getCharacterData();
    await loadAndSetModel(characterData.model);

    // Apply all customizations in the proper order
    applyFullCharacterData();

    // Set up camera
    setupCamera();
  }

  /**
   * Clean up the character creation environment
   */
  private cleanup(): void {
    cleanupCamera();
  }
}

// Export a singleton instance
export const uiManager = new UiManager();

// Export compatibility function for existing code
export const toggleUI = (state: boolean) => uiManager.toggle(state);
