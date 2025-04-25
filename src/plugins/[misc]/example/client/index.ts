/// <reference types="@citizenfx/client" />

console.log('Example client script loaded! F2 key will toggle UI');

// Variable to track UI state
let uiVisible = false;

/**
 * Toggle UI visibility
 * @param {boolean} state - The state to set the UI to (true = visible, false = hidden)
 */
function toggleUI(state: boolean) {
  console.log(`[example] Toggling UI to ${state ? 'visible' : 'hidden'}`);
  uiVisible = state;

  // Send message to NUI - note that we're sending the state directly as the data property
  // This matches what the Page.tsx component expects in the useNuiEvent hook
  SendNUIMessage({
    action: 'example:toggle-ui',
    data: state,
  });

  // Set focus to UI when visible
  SetNuiFocus(state, state);
  console.log(`[example] NUI focus set to ${state}`);
}

// Register a command that can be triggered by key binding
RegisterCommand(
  'example:toggle_ui',
  () => {
    console.log('[example] Command triggered: example:toggle_ui');
    toggleUI(!uiVisible); // Toggle the UI state
  },
  false
);

// Register key mapping (F2 key)
RegisterKeyMapping('example:toggle_ui', 'Toggle Example UI', 'keyboard', 'F2');
console.log('[example] Registered key mapping for F2 key');

// Handle NUI callback when UI is closed from the interface
RegisterNuiCallback(
  'example:toggle-ui',
  (data: any, cb: (data: any) => void) => {
    console.log(
      '[example] Received NUI callback with data:',
      JSON.stringify(data)
    );

    // Toggle UI off when receiving the close signal
    toggleUI(false);

    // Always send a response back to the NUI to prevent the request from stalling
    cb({ status: 'ok' });
  }
);

// Initialize UI as hidden on resource start
AddEventHandler('onClientResourceStart', (resourceName: string) => {
  if (resourceName === GetCurrentResourceName()) {
    console.log('[example] Resource started, initializing UI as hidden');
    toggleUI(false);
  }
});
