/// <reference types="@citizenfx/client" />

import { NUI_EVENT, getCharacterData, setUiVisible } from '../shared/store';
import { setupCamera, cleanupCamera } from './camera';
import {
  loadAndSetModel,
  applyFullCharacterData,
  faceCamera,
} from './character-manager';
import { Delay } from './utils';

/**
 * UI Manager for character creation
 * Handles UI visibility and setup/cleanup
 */
class UiManager {
  private _isSettingUp: boolean = false;
  private _isCleaningUp: boolean = false;

  /**
   * Toggle UI visibility
   * @param {boolean} state - The state to set the UI to (true = visible, false = hidden)
   */
  async toggle(state: boolean): Promise<void> {
    console.log(
      `[Character Create] Toggling UI to ${state ? 'visible' : 'hidden'}`
    );

    // Prevent concurrent setup/cleanup operations
    if ((state && this._isSettingUp) || (!state && this._isCleaningUp)) {
      console.log(
        '[Character Create] Setup/cleanup already in progress, ignoring toggle'
      );
      return;
    }

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
      await this.cleanup();
    }
  }

  /**
   * Set up the character creation environment
   */
  private async setup(): Promise<void> {
    this._isSettingUp = true;
    console.log('[Character Create] Setting up character creation environment');

    try {
      // Ensure player is visible
      SetEntityVisible(PlayerPedId(), true, false);

      // Always ensure we have a valid character model when opening the UI
      const characterData = getCharacterData();
      const modelLoaded = await loadAndSetModel(characterData.model);

      if (!modelLoaded) {
        console.error(
          '[Character Create] Failed to load model, retrying with default model'
        );
        // Try with the default male model as fallback
        await loadAndSetModel('mp_m_freemode_01');
      }

      // Short delay to ensure model is properly loaded
      await Delay(500);

      // Apply all customizations in the proper order
      applyFullCharacterData();

      // Set up camera
      setupCamera();

      // Short delay to ensure camera is set up
      await Delay(100);

      // Make the character face the camera
      faceCamera();

      console.log('[Character Create] Setup completed successfully');
    } catch (error) {
      console.error('[Character Create] Setup failed:', error);
    } finally {
      this._isSettingUp = false;
    }
  }

  /**
   * Clean up the character creation environment
   */
  private async cleanup(): Promise<void> {
    this._isCleaningUp = true;
    console.log(
      '[Character Create] Cleaning up character creation environment'
    );

    try {
      // First clean up camera
      cleanupCamera();

      // Short delay to ensure cleanup completes
      await Delay(100);

      // Ensure player is visible after cleanup
      SetEntityVisible(PlayerPedId(), true, false);

      console.log('[Character Create] Cleanup completed successfully');
    } catch (error) {
      console.error('[Character Create] Cleanup failed:', error);
    } finally {
      this._isCleaningUp = false;
    }
  }
}

// Export a singleton instance
export const uiManager = new UiManager();

// Export compatibility function for existing code
export const toggleUI = (state: boolean) => uiManager.toggle(state);
