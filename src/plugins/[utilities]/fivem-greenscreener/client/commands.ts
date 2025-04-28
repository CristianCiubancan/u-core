/// <reference types="@citizenfx/client" />

import { initializePedCommands } from './pedCommands';
import { initializeObjectCommands } from './objectCommands';
import { initializeVehicleCommands } from './vehicleCommands';

export function initializeCommands() {
  initializePedCommands();
  initializeObjectCommands();
  initializeVehicleCommands();

  // --- Add Chat Suggestions ---
  setImmediate(() => {
    emit('chat:addSuggestions', [
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
    ]);
  });
}
