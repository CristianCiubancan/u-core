/// <reference types="@citizenfx/client" />

import { initializePedCommands } from './pedCommands';
import { initializeObjectCommands } from './objectCommands';
import { initializeVehicleCommands } from './vehicleCommands';
import { initializeUtilsCommands } from './utilsCommands'; // Import the initializer

export function initializeCommands() {
  initializePedCommands();
  initializeObjectCommands();
  initializeVehicleCommands();
  initializeUtilsCommands(); // Call the initializer

  // --- Add Chat Suggestions ---
  setImmediate(() => {
    emit('chat:addSuggestions', [
      {
        name: '/newscreenshot',
        help: 'Generate clothing & prop screenshots with optional parameters.',
        params: [
          {
            name: 'sex',
            help: '(Optional) Gender to process: male, female, or both (default).',
          },
          {
            name: 'category',
            help: '(Optional) Category to process: tops, legs, shoes, etc.',
          },
          {
            name: 'items_per_position',
            help: '(Optional) Max drawables/props per component.',
          },
          {
            name: 'variations_per_item',
            help: '(Optional) Max textures per drawable/prop.',
          },
        ],
      },
      {
        name: '/stopscreenshot',
        help: 'Stops the currently running /newscreenshot process.',
      },
      {
        name: '/screenshot',
        help: 'Generate clothing & prop screenshots for both genders.',
      },
      {
        name: '/customscreenshot',
        help: 'Generate specific clothing/prop screenshots.',
        params: [
          { name: 'component_id', help: 'Clothing/Prop Component ID' },
          { name: 'drawable_id/"all"', help: 'Drawable/Prop ID or "all"' },
          { name: 'type', help: 'CLOTHING or PROPS' },
          { name: 'gender', help: 'male, female, or both' },
          {
            name: 'camera_json',
            help: '(Optional) JSON camera settings override',
          },
        ],
      },
      {
        name: '/screenshotobject',
        help: 'Generate screenshot for a specific object or weapon.',
        params: [
          { name: 'object_hash_or_name', help: 'Object/Weapon Hash or Name' },
        ],
      },
      {
        name: '/screenshotvehicle',
        help: 'Generate screenshot(s) for vehicle(s).',
        params: [
          { name: 'model_name/"all"', help: 'Vehicle Model Name or "all"' },
          { name: 'primary_color', help: '(Optional) Primary Color ID' },
          { name: 'secondary_color', help: '(Optional) Secondary Color ID' },
        ],
      },
      {
        name: '/listvariations',
        help: 'List available clothing and prop variations for peds.',
        params: [
          {
            name: 'gender',
            help: '(Optional) male, female, or both (default)',
          },
        ],
      },
    ]);
  });
}
