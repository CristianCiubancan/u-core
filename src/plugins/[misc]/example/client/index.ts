/// <reference types="@citizenfx/client" />

namespace Example {
  // Constants
  const NUI_EVENT = 'example:toggle-ui';
  const COMMAND_NAME = 'example:toggle_ui';

  // Variable to track UI state
  let uiVisible = false;

  /**
   * Toggle UI visibility
   * @param {boolean} state - The state to set the UI to (true = visible, false = hidden)
   */
  function toggleUI(state: boolean) {
    uiVisible = state;

    // Send message to NUI
    SendNUIMessage({
      action: NUI_EVENT,
      data: state,
    });

    // Set focus to UI when visible
    SetNuiFocus(state, state);
  }

  // Register a command that can be triggered by key binding
  RegisterCommand(COMMAND_NAME, () => toggleUI(!uiVisible), false);

  // Register key mapping (F2 key)
  RegisterKeyMapping(COMMAND_NAME, 'Toggle Example UI', 'keyboard', 'F2');

  // Handle NUI callback when UI is closed from the interface
  RegisterNuiCallback(NUI_EVENT, (data: any, cb: (data: any) => void) => {
    if (data.close) {
      toggleUI(false);
    }

    // Send response back to NUI
    cb({ status: 'ok' });
  });

  // Initialize UI as hidden on resource start
  AddEventHandler('onClientResourceStart', (resourceName: string) => {
    if (resourceName === GetCurrentResourceName()) {
      toggleUI(false);
    }
  });

  // Add a basic log on script load
  console.log('Example client script loaded! F2 key will toggle UI');
}
