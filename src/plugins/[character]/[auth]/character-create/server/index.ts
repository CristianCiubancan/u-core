/// <reference types="@citizenfx/server" />
import 'dotenv/config';
import { CharacterData } from '../shared/types';
import {
  validateCharacterData,
  formatValidationErrors,
} from '../shared/validators';

/**
 * Character Creation Server
 * Handles saving character data and other server-side operations
 */
class CharacterServer {
  /**
   * Initialize the server
   */
  initialize(): void {
    // Register event handlers
    this.registerEventHandlers();

    // Log when the resource starts
    console.log('[Character Create] Server script loaded!');
  }

  /**
   * Register event handlers
   */
  private registerEventHandlers(): void {
    // Event handler for saving character data
    onNet('character-create:save', this.handleSaveCharacter.bind(this));
  }

  /**
   * Handle saving character data. The payload arrives over the network as
   * arbitrary JSON; treat it as `unknown` and validate before any side
   * effect. Invalid payloads are dropped with an audit log keyed by source
   * — net IDs are the only attribution available here.
   */
  private handleSaveCharacter(payload: unknown): void {
    const source = global.source;
    const playerId = source.toString();

    if (!validateCharacterData(payload)) {
      console.warn(
        `[Character Create] [audit] dropped 'character-create:save' from net=${playerId}: ${formatValidationErrors(validateCharacterData.errors)}`
      );
      // Surface the rejection back to the client so the UI can react;
      // do not echo the payload contents.
      emitNet('character-create:save-result', source, {
        success: false,
        error: 'invalid character payload',
      });
      return;
    }

    const characterData: CharacterData = payload;

    console.log(
      `[Character Create] Saving character data for player ${playerId}`
    );

    try {
      // Here you would typically save the character data to a database
      // For this example, we'll just log it
      console.log(
        '[Character Create] Character data:',
        JSON.stringify(characterData)
      );

      // Send a success message back to the client
      emitNet('character-create:save-result', source, { success: true });
    } catch (error) {
      console.error(`[Character Create] Error saving character data: ${error}`);
      emitNet('character-create:save-result', source, {
        success: false,
        error: 'Failed to save character data',
      });
    }
  }
}

// Create and initialize the server
const server = new CharacterServer();
server.initialize();
