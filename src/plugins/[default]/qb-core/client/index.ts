/// <reference types="@citizenfx/client" />

// Client entry — registers GetCoreObject + Get* exports plus the
// per-Functions exports, mirroring server/index.ts.

import { QBCore } from './qbcore';
import { installClientFunctions } from './functions';
import { installClientEvents } from './events';
import { installClientLoops } from './loops';
import { installClientDrawText } from './drawtext';

installClientFunctions(QBCore);
installClientEvents(QBCore);
installClientLoops(QBCore);
installClientDrawText();

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
// name is registered by `client/zz_compat.lua` with a wrapper that
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

console.log(
  `^2[qb-core]^7 client port loaded. Functions registered: ${
    Object.keys(QBCore.Functions).length
  }, Lang phrases: ${
    Object.keys((QBCore as any).Lang.phrases as Record<string, string>).length
  }.`
);
