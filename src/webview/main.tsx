import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Page from 'virtual:plugin-page';
import { isEnvBrowser } from './utils/misc';
import { setupDevTools, simulateNuiEvent } from './utils/devtools';

// CSS and i18n are owned by the `_shared` FiveM resource — its `_shared.js`
// runs before this script (BuildManager injects the script tag) and assigns
// React, ReactDOM, ReactDOMClient, ReactI18Next, I18Next, ReactIcons to
// window. Tailwind + theme styles are loaded once via a `<link>` to
// `https://cfx-nui-_shared/style.css` in the per-plugin index.html, so this
// entry no longer imports either.

const initApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Page />
    </StrictMode>
  );

  if (isEnvBrowser()) {
    console.groupCollapsed('🛠️ FiveM UI - Browser Development Mode');
    console.log('Development tools initialized');
    console.log('UI will always be visible in browser environment');
    console.log('NUI events will be simulated with mock responses');
    console.groupEnd();

    setupDevTools();

    setTimeout(() => {
      simulateNuiEvent('ui');
    }, 100);
  }
};

initApp();
