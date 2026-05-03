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

(globalThis as any).exports('GetCoreObject', GetCoreObject);
(globalThis as any).exports('GetSharedItems', () => QBCore.Shared.Items);
(globalThis as any).exports('GetSharedVehicles', () => QBCore.Shared.Vehicles);
(globalThis as any).exports('GetSharedWeapons', () => QBCore.Shared.Weapons);
(globalThis as any).exports('GetSharedJobs', () => QBCore.Shared.Jobs);
(globalThis as any).exports('GetSharedGangs', () => QBCore.Shared.Gangs);

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
  '^3[qb-core]^7 Phase 2a (scaffold) running. Functions/Player/Commands stubs throw if called — Phase 2b/c will land the runtime code.'
);
