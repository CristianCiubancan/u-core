/// <reference types="@citizenfx/client" />

// Client-side mirror of the per-account locale system. The server
// authoritative source pushes via `QBCore:Locale:Changed` (fired on
// PlayerLoaded and on every SetPlayerLocale). We cache it locally so
// other client-side scripts can read the player's locale synchronously
// via `exports['qb-core'].GetCurrentLocale()`.
//
// We do NOT SendNUIMessage from here. SendNUIMessage is resource-scoped
// — it only delivers to the calling resource's NUI iframe, so a
// SendNUIMessage from qb-core would land in qb-core's DrawText overlay,
// not in qb-multicharacter's or qb-spawn's webview. Each plugin that
// ships an i18next-driven webview installs its own
// `onNet('QBCore:Locale:Changed')` handler that calls SendNUIMessage
// from inside that resource. See e.g. qb-multicharacter/client/index.ts.

let currentLocale = 'en';

export function installClientLocale(): void {
  onNet('QBCore:Locale:Changed', (code: string) => {
    if (typeof code !== 'string' || !code) return;
    currentLocale = code;
  });

  const exportFn = (globalThis as any).exports as (
    name: string,
    fn: unknown
  ) => void;
  exportFn('GetCurrentLocale', () => currentLocale);
}
