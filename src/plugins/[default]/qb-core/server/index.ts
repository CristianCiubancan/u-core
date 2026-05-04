/// <reference types="@citizenfx/server" />

// Server entry — registers exports so other resources can call
// `exports['qb-core']:GetCoreObject()` and reach the QBCore namespace.
//
// Phase 2a: Shared data wiring + filtered GetCoreObject + the
// Get* shortcuts (GetSharedItems/Vehicles/etc) that upstream
// main.lua exposes. Functions/Player/Commands surfaces are stubbed
// in qbcore.ts and will throw "not implemented" if a downstream
// resource calls them before Phase 2b/c lands the runtime code —
// loud failure is preferable to silent misbehavior.

import { QBCore } from './qbcore';
import { installFunctions } from './functions';
import { installPlayer } from './player';
import { installEvents } from './events';
import { installCommands } from './commands';
import { installExtraExports } from './exports';
import { installDebug } from './debug';

// Replace the throw-on-call Functions / Player / Commands stubs from
// qbcore.ts with the real implementations, then wire up server-side
// event handlers and the runtime-extension exports. Commands MUST run
// after Functions+Player+Events because the built-in admin commands
// reach into Functions.GetPlayer / Player.Functions.SetJob / etc, and
// Add() is what downstream qb-* resources call at THEIR module load
// — installing it before they boot prevents the cascading throw chain
// that crashes qb-multicharacter and emits SCRIPT ERRORs in every
// other dependent resource.
installFunctions(QBCore);
installPlayer(QBCore);
installEvents(QBCore);
installCommands(QBCore);
installExtraExports(QBCore);
installDebug(QBCore);

/**
 * Mirror of upstream main.lua's `GetCoreObject(filters)`. With no
 * filter returns the whole QBCore namespace; with a string array
 * returns just those keys (used to limit cross-resource exposure).
 */
function GetCoreObject(filters?: string[]): unknown {
  if (!filters || !Array.isArray(filters) || filters.length === 0) {
    return QBCore;
  }
  const result: Record<string, unknown> = {};
  for (const key of filters) {
    if (key in QBCore) {
      result[key] = (QBCore as unknown as Record<string, unknown>)[key];
    }
  }
  return result;
}

const exportFn = (globalThis as any).exports as (name: string, fn: unknown) => void;

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
  'GetPlayersByJob',
  'GetPlayersOnDuty',
  'GetBucketObjects',
]);

exportFn('_GetCoreObject_Internal', GetCoreObject);
exportFn('GetSharedItems', () => QBCore.Shared.Items);
exportFn('GetSharedVehicles', () => QBCore.Shared.Vehicles);
exportFn('GetSharedWeapons', () => QBCore.Shared.Weapons);
exportFn('GetSharedJobs', () => QBCore.Shared.Jobs);
exportFn('GetSharedGangs', () => QBCore.Shared.Gangs);
// Mirror upstream's `GetShared(namespace, item)` export — generic
// keyed access into QBCore.Shared used by a handful of consumer
// resources to look up an item/vehicle/weapon/job/gang by string
// name without having to choose the right specific export.
exportFn(
  'GetShared',
  (namespace: string, item: string) =>
    (QBCore.Shared as Record<string, Record<string, unknown>>)[namespace]?.[item]
);

// Mirror upstream's pattern of re-exporting every QBCore.Functions
// member as a top-level export, so callers can do
// `exports['qb-core']:Notify(src, msg)` directly without going
// through `GetCoreObject().Functions.Notify`.
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
  `^2[qb-core]^7 u-core port loaded — Shared.Items=${
    Object.keys(QBCore.Shared.Items).length
  }, Vehicles=${Object.keys(QBCore.Shared.Vehicles).length}, Weapons=${
    Object.keys(QBCore.Shared.Weapons).length
  }, Jobs=${Object.keys(QBCore.Shared.Jobs).length}, Gangs=${
    Object.keys(QBCore.Shared.Gangs).length
  }, Locations=${Object.keys(QBCore.Shared.Locations).length}.`
);
console.log(
  `^3[qb-core]^7 server port complete. Functions + Player + Events + Commands (${
    Object.keys((QBCore as any).Commands.List as Record<string, unknown>).length
  } admin cmds) + ExtraExports + Debug + Lang (${
    Object.keys((QBCore as any).Lang.phrases as Record<string, string>).length
  } phrases) wired.`
);
