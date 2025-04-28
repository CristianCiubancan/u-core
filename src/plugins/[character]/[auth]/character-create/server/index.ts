/// <reference types="@citizenfx/server" />
import 'dotenv/config';
import { CharacterData } from '../shared/types';

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
   * Handle saving character data
   * @param {CharacterData} characterData - The character data to save
   */
  private handleSaveCharacter(characterData: CharacterData): void {
    const source = global.source;
    const playerId = source.toString();

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
