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
AddEventHandler('onClientResourceStart', (resourceName: string) => {
  if (resourceName === GetCurrentResourceName()) {
    console.log('[Character Create] Resource started');

    // Initialize UI as hidden
    toggleUI(false);

    // Pre-load character models to ensure they're available when needed
    const maleModel = 'mp_m_freemode_01';
    const femaleModel = 'mp_f_freemode_01';

    console.log('[Character Create] Pre-loading character models');
    characterManager.loadAndSetModel(maleModel).then(() => {
      console.log('[Character Create] Male model loaded');
    });
    RequestModel(GetHashKey(femaleModel));

    // Auto-open character creation for new players
    setTimeout(async () => {
      console.log('[Character Create] Auto-opening character creation UI');
      // Use Delay utility for timeout
      await Delay(2000);
      toggleUI(true);
    }, 0); // setTimeout with 0ms delay to run after current execution context
  }
});

// Add a basic log on script load
console.log('Character creation client script loaded! F3 key will toggle UI');
