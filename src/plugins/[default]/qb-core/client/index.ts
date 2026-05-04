/// <reference types="@citizenfx/client" />

// Client entry — registers GetCoreObject + Get* exports plus the
// per-Functions exports, mirroring server/index.ts.

import { QBCore } from './qbcore';
import { installClientFunctions } from './functions';
import { installClientEvents } from './events';
import { installClientLoops } from './loops';
import { installClientDrawText } from './drawtext';
import { installClientLocale } from './locale';

installClientFunctions(QBCore);
installClientEvents(QBCore);
installClientLoops(QBCore);
installClientLocale();
// installClientDrawText() runs LATER, after the auto-export-all-Functions
// loop below — see the comment above that loop for why order matters here.

function GetCoreObject(filters?: string[]): unknown {
  if (!filters || !Array.isArray(filters) || filters.length === 0) {
    return QBCore;
  }
  const result: Record<string, unknown> = {};
  for (const key of filters) {
    if (key in QBCore) result[key] = (QBCore as Record<string, unknown>)[key];
  }
  return result;
}

const exportFn = (globalThis as any).exports as (
  name: string,
  fn: unknown
) => void;

// Functions whose upstream Lua signature returns multiple values
// (`return a, b`). Our TS port returns `[a, b]` — a JS array — which
// crosses the JS→Lua FFI as a single Lua table, NOT as multi-returns.
// We expose these only under `_<Name>_Internal` from JS; the public
// name is registered by `shared/compat.lua` with a wrapper that
// unpacks the array into Lua multi-returns. Same shim also patches
// `core.Functions[name]` inside `GetCoreObject`'s return.
const MULTI_RETURN_FNS = new Set([
  'GetClosestPlayer',
  'GetClosestPed',
  'GetClosestVehicle',
  'GetClosestObject',
]);

exportFn('_GetCoreObject_Internal', GetCoreObject);
exportFn('GetSharedItems', () => QBCore.Shared.Items);
exportFn('GetSharedVehicles', () => QBCore.Shared.Vehicles);
exportFn('GetSharedWeapons', () => QBCore.Shared.Weapons);
exportFn('GetSharedJobs', () => QBCore.Shared.Jobs);
exportFn('GetSharedGangs', () => QBCore.Shared.Gangs);
// Mirror upstream's QBShared.GetShared export — keyed access into
// QBCore.Shared by namespace+item.
exportFn(
  'GetShared',
  (namespace: string, item: string) =>
    (QBCore.Shared as Record<string, Record<string, unknown>>)[namespace]?.[item]
);

// Auto-export every QBCore.Functions member (mirrors upstream
// client/functions.lua's `for functionName, func in pairs(QBCore.Functions)
// do exports(functionName, func) end` at the file's tail).
for (const [name, fn] of Object.entries(
  QBCore.Functions as Record<string, unknown>
)) {
  if (typeof fn !== 'function') continue;
  if (MULTI_RETURN_FNS.has(name)) {
    exportFn(`_${name}_Internal`, fn);
  } else {
    exportFn(name, fn);
  }
}

// MUST run AFTER the auto-loop above. `QBCore.Functions.DrawText` is the
// game-native 2D text helper (10 numeric args); `exports['qb-core']:DrawText`
// must be the NUI corner overlay (text, position). Both share a name, so
// last-wins decides — and the NUI version must win. Upstream resolves this
// the same way: client/functions.lua runs the auto-loop, then client/drawtext.lua
// runs LAST in client_scripts and overwrites with the NUI variant. Calling
// installClientDrawText() before the loop (an earlier mistake) inverted the
// order and left every `exports['qb-core']:DrawText('text', 'left')` calling
// the game-native function with mismatched arg types — nothing visible.
installClientDrawText();

console.log(
  `^2[qb-core]^7 client port loaded. Functions registered: ${
    Object.keys(QBCore.Functions).length
  }, Lang phrases: ${
    Object.keys((QBCore as any).Lang.phrases as Record<string, string>).length
  }.`
);
