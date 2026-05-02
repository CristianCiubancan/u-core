declare global {
  interface Window {
    GetParentResourceName?: () => string;
  }
}

import { isEnvBrowser } from './misc';
import type {
  NuiAction,
  NuiCallbackMap,
} from '../../plugins/[character]/[auth]/character-create/shared/types';

// Mock responses for browser development environment. Keyed by NUI action
// string; loosely typed because the dev-mode mock doesn't have to match
// the real wire format perfectly — only enough for the UI to behave.
const mockResponses: Partial<Record<NuiAction | string, unknown>> = {
  'character-create:toggle-ui': { status: 'ok' },
  'character-create:update-model': { status: 'ok' },
  'character-create:update-face': { status: 'ok' },
  'character-create:update-hair': { status: 'ok' },
  'character-create:update-appearance': { status: 'ok' },
  'character-create:update-clothing': { status: 'ok' },
  'character-create:rotate-camera': { status: 'ok' },
  'character-create:zoom-camera': { status: 'ok' },
  'character-create:focus-camera': { status: 'ok' },
  'character-create:rotate-player': { status: 'ok' },
  'character-create:drag-camera': { status: 'ok' },
  'character-create:drag-end': { status: 'ok' },
};

/**
 * Typed wrapper around the CEF/NUI `fetch` bridge. The action string must
 * be a known key of `NuiCallbackMap`; the request and response types are
 * inferred from that map at the call site. In browser dev mode the call
 * is intercepted and a mock response is returned after a short delay; in
 * the FiveM runtime the request is POSTed to `https://${resource}/${action}`.
 */
export async function fetchNui<K extends NuiAction>(
  eventName: K,
  data?: NuiCallbackMap[K]['request']
): Promise<NuiCallbackMap[K]['response']> {
  if (isEnvBrowser()) {
    console.groupCollapsed(`📡 NUI Call: ${eventName}`);
    console.log('Request Data:', data);

    return new Promise((resolve) => {
      setTimeout(() => {
        const response =
          mockResponses[eventName] ?? ({ status: 'ok' } as const);
        console.log('Response:', response);
        console.groupEnd();
        resolve(response as NuiCallbackMap[K]['response']);
      }, 500);
    });
  }

  const actualData = data ?? {};
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(actualData),
  };

  const resourceName = window.GetParentResourceName
    ? window.GetParentResourceName()
    : 'nui-frame-app';

  try {
    const resp = await fetch(`https://${resourceName}/${eventName}`, options);
    return (await resp.json()) as NuiCallbackMap[K]['response'];
  } catch (error) {
    console.error(`Error in fetchNui for event ${eventName}:`, error);
    throw error;
  }
}
