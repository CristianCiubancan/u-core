/**
 * FiveM Character Creator - Client Side Script
 *
 * This script manages the character creation interface and functionality
 * for players to customize their characters in a FiveM server.
 */

/// <reference types="@citizenfx/client" />

import { toggleUI } from './ui';
import { registerEvents } from './events';
import { Delay } from './utils';
import { characterManager } from './character-manager';

/**
 * =======================================================
 * INITIALIZATION
 * =======================================================
 */

// Register all events (NUI callbacks, commands, etc.)
registerEvents();

// Initialize UI as hidden on resource start
AddEventHandler('onClientResourceStart', async (resourceName: string) => {
  if (resourceName === GetCurrentResourceName()) {
    console.log('[Character Create] Resource started');

    // Initialize UI as hidden
    toggleUI(false);

    // Pre-load character models to ensure they're available when needed
    const maleModel = 'mp_m_freemode_01';

    console.log('[Character Create] Pre-loading character models');
    try {
      await characterManager.loadAndSetModel(maleModel);
      console.log('[Character Create] Male model loaded');

      // Ensure player is visible
      SetEntityVisible(PlayerPedId(), true, false);
    } catch (error) {
      console.error('[Character Create] Failed to pre-load models:', error);
    }

    // Auto-open character creation for new players with a longer delay
    setTimeout(async () => {
      console.log('[Character Create] Auto-opening character creation UI');
      // Use longer delay to ensure everything is loaded properly
      await Delay(3000);
      toggleUI(true);
    }, 0);
  }
});

// Add a basic log on script load
console.log('Character creation client script loaded! F3 key will toggle UI');
