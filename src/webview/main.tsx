import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/index.css';
import App from './App.tsx';
import { isEnvBrowser } from './utils/misc';
import { setupDevTools, simulateNuiEvent } from './utils/devtools';
import './i18n';

// Initialize the app
const initApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Setup development tools if in browser environment
  if (isEnvBrowser()) {
    // Using a single dev logging group for cleaner console output
    console.groupCollapsed('🛠️ FiveM UI - Browser Development Mode');
    console.log('Development tools initialized');
    console.log('UI will always be visible in browser environment');
    console.log('NUI events will be simulated with mock responses');
    console.groupEnd();

    // Setup dev toolbar
    setupDevTools();

    // Automatically trigger UI event to show the interface
    // This makes it always visible during development
    setTimeout(() => {
      simulateNuiEvent('ui');
    }, 100);
  }
};

// Start the application
initApp();
