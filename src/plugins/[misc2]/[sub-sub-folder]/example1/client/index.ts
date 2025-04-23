/// <reference types="@citizenfx/client" />

// Main client script that uses the event handler

// Import the safe message sender (if using a module system)
// const { safeSendNUIMessage } = require('./eventHandler.js');

// Function to safely send messages (simplified version if not using the full handler)
function safeSendNUIMessage(data: any) {
  SendNUIMessage(data);
  console.log('Sent message:', data.action);
}

// Send first message with a delay to let UI initialize
safeSendNUIMessage({
  action: 'ui',
  data: {
    message: 'First message from client',
  },
});

// Send second message after another delay
setTimeout(() => {
  safeSendNUIMessage({
    action: 'ui',
    data: {
      message: 'Second message from client',
    },
  });
}, 2000);
