/// <reference types="@citizenfx/server" />

// QBCore namespace — the singleton object returned by
// `exports['qb-core']:GetCoreObject()`. Every QBCore-aware resource
// reaches into this object, so the SHAPE here is part of our public
// API contract with downstream Lua/JS plugins. Adding new top-level
// keys is fine; renaming or removing is a breaking change.
//
// Phase 2a: Shared data wired in, Players/Player_Buckets maps
// initialized empty. Functions/Player/Commands are stubbed with
// placeholders that throw "not yet implemented" so it's obvious
// when something tries to call them before Phase 2b/c lands.

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

/** Build the QBShared namespace as upstream Lua does at module load:
 *  weapons keyed by GetHashKey(name) (matches the backtick-hash trick
 *  in upstream weapons.lua); vehicles available BOTH by string model
 *  (QBCore.Shared.Vehicles[model]) AND by hash (VehicleHashes[hash]).
 */
function buildShared() {
  // Hash-keyed weapons. Phase 1 stores weapons string-keyed so the
  // data is consumable from environments without GetHashKey (the
  // webview); on the server we call GetHashKey at module load to
  // produce the shape downstream resources expect. JS bitwise ops
  // produce signed 32-bit ints, but GetHashKey already returns the
  // signed form FXServer uses, so we just consume it directly.
  const Weapons: Record<number, Weapon> = {};
  for (const w of Object.values(NameKeyedWeapons)) {
    Weapons[GetHashKey(w.name)] = w;
  }

  // Vehicles need hash-keyed access too via VehicleHashes.
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
    // Utility helpers attached to QBShared in upstream main.lua so
    // they're reachable as `QBCore.Shared.RandomStr(8)` etc.
    RandomStr,
    RandomInt,
    SplitStr,
    Trim,
    FirstToUpper,
    Round,
    IsFunction,
    // ChangeVehicleExtra/SetDefaultVehicleExtras live on the client
    // Shared namespace only — they call FiveM client natives that
    // don't exist on the server. Calling these from server-side code
    // errors in upstream too.
  };
}

const NOT_YET = (name: string) => () => {
  throw new Error(
    `[qb-core] ${name} is not implemented yet — qb-core port is in Phase 2a (scaffold only). Drop a runtime call site or wait for Phase 2b/c.`
  );
};

/** Live state — populated as players connect and call Login. Phase 2c
 *  will fill these out. */
export const Players: Record<number, unknown> = {};
export const Player_Buckets: Record<string, { id: number; bucket: number }> =
  {};
export const Entity_Buckets: Record<number, { id: number; bucket: number }> =
  {};
export const UsableItems: Record<string, { resource?: string; cb: unknown }> =
  {};
export const ClientCallbacks: Record<string, unknown> = {};
export const ServerCallbacks: Record<string, unknown> = {};

export const QBCore = {
  Config: QBConfig,
  Shared: buildShared(),
  /** Locale instance with English phrases baked in. Downstream Lua
   *  resources reach this via the global `Lang` after qb-core loads;
   *  TypeScript consumers can either go through
   *  `QBCore.Lang.t('error.no_waypoint')` or import from
   *  `'../qb-core/shared/lang'` directly. */
  Lang,
  Players,
  Player_Buckets,
  Entity_Buckets,
  UsableItems,
  ClientCallbacks,
  ServerCallbacks,

  /** Filled in by Phase 2b. Intentional throw on access until then. */
  Functions: {
    GetPlayer: NOT_YET('QBCore.Functions.GetPlayer'),
    GetPlayers: NOT_YET('QBCore.Functions.GetPlayers'),
    GetIdentifier: NOT_YET('QBCore.Functions.GetIdentifier'),
    GetSource: NOT_YET('QBCore.Functions.GetSource'),
    CreateCallback: NOT_YET('QBCore.Functions.CreateCallback'),
    TriggerCallback: NOT_YET('QBCore.Functions.TriggerCallback'),
    CreateUseableItem: NOT_YET('QBCore.Functions.CreateUseableItem'),
    CanUseItem: NOT_YET('QBCore.Functions.CanUseItem'),
    UseItem: NOT_YET('QBCore.Functions.UseItem'),
    Kick: NOT_YET('QBCore.Functions.Kick'),
    IsWhitelisted: NOT_YET('QBCore.Functions.IsWhitelisted'),
    AddPermission: NOT_YET('QBCore.Functions.AddPermission'),
    RemovePermission: NOT_YET('QBCore.Functions.RemovePermission'),
    HasPermission: NOT_YET('QBCore.Functions.HasPermission'),
    GetPermission: NOT_YET('QBCore.Functions.GetPermission'),
    IsOptin: NOT_YET('QBCore.Functions.IsOptin'),
    ToggleOptin: NOT_YET('QBCore.Functions.ToggleOptin'),
    IsPlayerBanned: NOT_YET('QBCore.Functions.IsPlayerBanned'),
    IsLicenseInUse: NOT_YET('QBCore.Functions.IsLicenseInUse'),
    SetPlayerBucket: NOT_YET('QBCore.Functions.SetPlayerBucket'),
    SetEntityBucket: NOT_YET('QBCore.Functions.SetEntityBucket'),
    GetPlayersInBucket: NOT_YET('QBCore.Functions.GetPlayersInBucket'),
    GetEntitiesInBucket: NOT_YET('QBCore.Functions.GetEntitiesInBucket'),
    SpawnVehicle: NOT_YET('QBCore.Functions.SpawnVehicle'),
    CreatePhoneNumber: NOT_YET('QBCore.Functions.CreatePhoneNumber'),
    CreateAccountNumber: NOT_YET('QBCore.Functions.CreateAccountNumber'),
    PrepForSQL: NOT_YET('QBCore.Functions.PrepForSQL'),
    Notify: NOT_YET('QBCore.Functions.Notify'),
    GetDatabaseInfo: NOT_YET('QBCore.Functions.GetDatabaseInfo'),
  },

  /** Filled in by Phase 2c. */
  Player: {
    Login: NOT_YET('QBCore.Player.Login'),
    Logout: NOT_YET('QBCore.Player.Logout'),
    CreatePlayer: NOT_YET('QBCore.Player.CreatePlayer'),
    DeleteCharacter: NOT_YET('QBCore.Player.DeleteCharacter'),
    GetOfflinePlayer: NOT_YET('QBCore.Player.GetOfflinePlayer'),
    SaveOffline: NOT_YET('QBCore.Player.SaveOffline'),
    Save: NOT_YET('QBCore.Player.Save'),
    CreateCitizenId: NOT_YET('QBCore.Player.CreateCitizenId'),
    CreateFingerId: NOT_YET('QBCore.Player.CreateFingerId'),
    CreateWalletId: NOT_YET('QBCore.Player.CreateWalletId'),
    CreateSerialNumber: NOT_YET('QBCore.Player.CreateSerialNumber'),
  },

  /** Filled in by Phase 2d. */
  Commands: {
    Add: NOT_YET('QBCore.Commands.Add'),
    Refresh: NOT_YET('QBCore.Commands.Refresh'),
    List: {} as Record<string, unknown>,
    IgnoreList: {} as Record<string, boolean>,
  },
};

export type QBCoreShape = typeof QBCore;
