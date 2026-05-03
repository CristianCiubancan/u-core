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

exportFn('GetCoreObject', GetCoreObject);
exportFn('GetSharedItems', () => QBCore.Shared.Items);
exportFn('GetSharedVehicles', () => QBCore.Shared.Vehicles);
exportFn('GetSharedWeapons', () => QBCore.Shared.Weapons);
exportFn('GetSharedJobs', () => QBCore.Shared.Jobs);
exportFn('GetSharedGangs', () => QBCore.Shared.Gangs);

for (const [name, fn] of Object.entries(
  QBCore.Functions as Record<string, unknown>
)) {
  if (typeof fn === 'function') {
    exportFn(name, fn);
  }
}

console.log(
  `^2[qb-core]^7 client port loaded. Functions registered: ${
    Object.keys(QBCore.Functions).length
  }.`
);
