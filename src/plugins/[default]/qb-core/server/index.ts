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

// Replace the throw-on-call Functions stubs from qbcore.ts with the
// real implementations from functions.ts.
installFunctions(QBCore);

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

exportFn('GetCoreObject', GetCoreObject);
exportFn('GetSharedItems', () => QBCore.Shared.Items);
exportFn('GetSharedVehicles', () => QBCore.Shared.Vehicles);
exportFn('GetSharedWeapons', () => QBCore.Shared.Weapons);
exportFn('GetSharedJobs', () => QBCore.Shared.Jobs);
exportFn('GetSharedGangs', () => QBCore.Shared.Gangs);

// Mirror upstream's pattern of re-exporting every QBCore.Functions
// member as a top-level export, so callers can do
// `exports['qb-core']:Notify(src, msg)` directly without going
// through `GetCoreObject().Functions.Notify`.
for (const [name, fn] of Object.entries(
  QBCore.Functions as Record<string, unknown>
)) {
  if (typeof fn === 'function') {
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
  '^3[qb-core]^7 Phase 2b running. Functions wired; Player/Commands still stubbed pending Phase 2c/d.'
);
