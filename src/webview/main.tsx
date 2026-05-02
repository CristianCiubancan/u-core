import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/index.css';
import Page from 'virtual:plugin-page';
import { isEnvBrowser } from './utils/misc';
import { setupDevTools, simulateNuiEvent } from './utils/devtools';

// i18n is lazy-loaded — no plugin currently calls `useTranslation`, so the
// init bundle (i18next + react-i18next + 30 KB of inline resources) stays
// out of the page payload until the first plugin actually opts in.
async function loadI18n(): Promise<void> {
  await import('./i18n');
}

// Initialize the app
const initApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Page />
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

// Start the application. `loadI18n` is referenced so the lazy-loader stays
// in the module graph and a future plugin can call it on demand without a
// build-time wiring change; currently no plugin uses `useTranslation`.
void loadI18n;
initApp();
