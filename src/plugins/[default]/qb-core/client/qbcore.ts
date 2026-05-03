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
} from '../shared/main';

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
  };
}

export const QBCore: any = {
  Config: QBConfig,
  Shared: buildShared(),
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
