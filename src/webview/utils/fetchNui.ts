declare global {
  interface Window {
    GetParentResourceName?: () => string;
  }
}

import { isEnvBrowser } from './misc';

/**
 * Typed wrapper around the CEF/NUI `fetch` bridge. The action string is
 * a free-form identifier — each plugin declares its own typed surface at
 * the call site:
 *
 *   const data = await fetchNui<MyReq, MyRes>('my-action', payload);
 *
 * No central action-map registry: per-plugin types stay scoped to the
 * plugin that owns them, and a deleted plugin can't break this shared
 * helper. Both type parameters default to `unknown` so untyped call
 * sites still work — the cost is a cast at the call site.
 *
 * In browser dev mode (`!window.invokeNative`) the call short-circuits
 * to `mockResponse` after a short delay so UIs are exercisable outside
 * FXServer. The default mock is `{ status: 'ok' }`; pass a third arg to
 * override per call.
 */
export async function fetchNui<TReq = unknown, TRes = unknown>(
  eventName: string,
  data?: TReq,
  mockResponse?: TRes
): Promise<TRes> {
  if (isEnvBrowser()) {
    console.groupCollapsed(`📡 NUI Call: ${eventName}`);
    console.log('Request Data:', data);

    return new Promise((resolve) => {
      setTimeout(() => {
        const response = (mockResponse ?? ({ status: 'ok' } as unknown)) as TRes;
        console.log('Response:', response);
        console.groupEnd();
        resolve(response);
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
    return (await resp.json()) as TRes;
  } catch (error) {
    console.error(`Error in fetchNui for event ${eventName}:`, error);
    throw error;
  }
}
