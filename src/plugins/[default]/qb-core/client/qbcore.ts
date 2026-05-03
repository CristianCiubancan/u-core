/// <reference types="@citizenfx/client" />

// Client-side QBCore namespace. Mirrors the server namespace shape
// (Config / Shared / Functions / Players...) but with client-specific
// state — `PlayerData` is the local player's data (received from
// server via QBCore:Player:SetPlayerData event), and there's no
// Players[] / Player_Buckets etc.

import { QBConfig } from '../config';
import { Items } from '../shared/items';
import { Vehicles as ModelVehicles, type Vehicle } from '../shared/vehicles';
import { Weapons as NameKeyedWeapons, type Weapon } from '../shared/weapons';
import { Jobs, ForceJobDefaultDutyAtLogin } from '../shared/jobs';
import { Gangs } from '../shared/gangs';
import { Locations } from '../shared/locations';
import {
  StarterItems,
  RandomStr,
  RandomInt,
  SplitStr,
  Trim,
  FirstToUpper,
  Round,
  MaleNoGloves,
  FemaleNoGloves,
  IsFunction,
} from '../shared/main';
import { Lang } from '../shared/lang';

// FiveM-client-only vehicle extra helpers. Match upstream's
// `QBShared.ChangeVehicleExtra` / `QBShared.SetDefaultVehicleExtras`.
// Recursive retry mirrors upstream: SetVehicleExtra is best-effort,
// the natives toggle the visibility flag but the engine doesn't always
// commit on the first call, so we re-check via IsVehicleExtraTurnedOn
// and retry until the desired state sticks.
function ChangeVehicleExtra(
  vehicle: number,
  extra: number,
  enable: boolean
): void {
  if (!DoesExtraExist(vehicle, extra)) return;
  if (enable) {
    SetVehicleExtra(vehicle, extra, false);
    if (!IsVehicleExtraTurnedOn(vehicle, extra)) {
      ChangeVehicleExtra(vehicle, extra, enable);
    }
  } else {
    SetVehicleExtra(vehicle, extra, true);
    if (IsVehicleExtraTurnedOn(vehicle, extra)) {
      ChangeVehicleExtra(vehicle, extra, enable);
    }
  }
}

function SetDefaultVehicleExtras(
  vehicle: number,
  config: Record<string, unknown>
): void {
  for (let i = 1; i <= 20; i++) {
    if (DoesExtraExist(vehicle, i)) {
      SetVehicleExtra(vehicle, i, true);
    }
  }
  for (const [id, raw] of Object.entries(config)) {
    const enabled = typeof raw === 'boolean' ? raw : true;
    ChangeVehicleExtra(vehicle, Number(id), enabled);
  }
}

function buildShared() {
  const Weapons: Record<number, Weapon> = {};
  for (const w of Object.values(NameKeyedWeapons)) {
    Weapons[GetHashKey(w.name)] = w;
  }
  const Vehicles: Record<string, Vehicle> = {};
  const VehicleHashes: Record<number, Vehicle> = {};
  for (const v of Object.values(ModelVehicles)) {
    const hash = GetHashKey(v.model);
    const enriched: Vehicle = { ...v, hash, spawncode: v.model };
    Vehicles[v.model] = enriched;
    VehicleHashes[hash] = enriched;
  }
  return {
    Items,
    Vehicles,
    VehicleHashes,
    Weapons,
    Jobs,
    Gangs,
    Locations,
    StarterItems,
    ForceJobDefaultDutyAtLogin,
    MaleNoGloves,
    FemaleNoGloves,
    RandomStr,
    RandomInt,
    SplitStr,
    Trim,
    FirstToUpper,
    Round,
    IsFunction,
    ChangeVehicleExtra,
    SetDefaultVehicleExtras,
  };
}

export const QBCore: any = {
  Config: QBConfig,
  Shared: buildShared(),
  /** Locale instance — same English phrases as the server bundle but
   *  a separate Locale instance (the two bundles don't share state).
   *  Downstream client code can `QBCore.Lang.t('error.no_waypoint')`
   *  or import from `'../qb-core/shared/lang'` directly. */
  Lang,
  /** Local player's data — populated by QBCore:Player:SetPlayerData
   *  event from the server. Empty object until first received. */
  PlayerData: {} as Record<string, unknown>,
  ClientCallbacks: {} as Record<string, (...args: unknown[]) => void>,
  ServerCallbacks: {} as Record<
    string,
    {
      callback?: (...args: unknown[]) => void;
      promise?: { resolve: (value: unknown) => void; value?: unknown };
    }
  >,
  Functions: {},
};

export type QBCoreClient = typeof QBCore;
