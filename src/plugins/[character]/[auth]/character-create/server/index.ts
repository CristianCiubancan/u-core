/// <reference types="@citizenfx/server" />
import 'dotenv/config';

// Event handler for saving character data
onNet('character-create:save', (characterData: any) => {
  const source = global.source;
  const playerId = source.toString();

  console.log(`Saving character data for player ${playerId}`);
  console.log('Character data:', JSON.stringify(characterData));

  // Here you would typically save the character data to a database
  // For this example, we'll just log it

  // Send a success message back to the client
  emitNet('character-create:save-result', source, { success: true });
});

// Log when the resource starts
console.log('Character creation server script loaded!');
