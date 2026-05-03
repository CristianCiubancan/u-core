/// <reference types="@citizenfx/server" />

// Server-side port of the original Lua qb-multicharacter. The QBCore
// event/callback contract is preserved verbatim — every other QB plugin
// still calling `qb-multicharacter:server:*` and friends keeps working
// while we incrementally port the rest of the suite.
//
// `LoadResourceFile` reads countries.json from this resource's tree;
// the build pipeline copies countries.json next to plugin.json verbatim.

import { Config } from '../shared/config';
import type { CharInfo } from '../shared/types';

const QBCore = (exports as any)['qb-core'].GetCoreObject();
const oxmysql = (exports as any).oxmysql;

const Countries: string[] = JSON.parse(
  LoadResourceFile(GetCurrentResourceName(), 'countries.json') || '[]'
);

// Tracks whether other resources have finished their preload hooks for a
// given source. We block `loadUserData` until this flips so downstream
// scripts (qb-clothing, qb-houses, …) see a fully-initialized player.
const hasDonePreloading = new Map<number, boolean>();

// Hard ceiling on how long we'll block waiting for the
// `QBCore:Server:PlayerLoaded` hook to flip `hasDonePreloading`. If
// QBCore (or anything wired to that event) never fires it, we still
// proceed with the spawn handoff — otherwise the qb-multicharacter
// React stays at its loading screen forever with no recovery, since
// the player never receives `closeNUI`.
const PRELOAD_TIMEOUT_MS = 10_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForPreloading(src: number): Promise<void> {
  const start = Date.now();
  while (!hasDonePreloading.get(src)) {
    if (Date.now() - start > PRELOAD_TIMEOUT_MS) {
      console.warn(
        `^3[qb-multicharacter]^7 preload timeout for src=${src} after ${PRELOAD_TIMEOUT_MS}ms; proceeding anyway`
      );
      return;
    }
    await sleep(10);
  }
}

async function safeLoadHouseData(src: number): Promise<void> {
  // qb-houses might not be installed (table missing) or oxmysql might
  // be slow. Either case shouldn't block the spawn handoff — that's a
  // worse outcome than skipping the house cache.
  try {
    await loadHouseData(src);
  } catch (err) {
    console.warn(
      `^3[qb-multicharacter]^7 loadHouseData failed for src=${src}: ${err}`
    );
  }
}

async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return (await oxmysql.query_async(sql, params)) as T[];
}

async function giveStarterItems(src: number): Promise<void> {
  const Player = QBCore.Functions.GetPlayer(src);
  if (!Player) return;

  const charinfo = Player.PlayerData.charinfo as CharInfo;
  const citizenid: string = Player.PlayerData.citizenid;

  // QBCore.Shared.StarterItems is a Lua table; depending on the QBCore
  // build it surfaces in JS as either an array (numeric keys) or an
  // object (named keys). Normalize before iterating; tolerate it being
  // missing entirely on builds that handed starter items to qb-inventory.
  const raw = (QBCore.Shared as any)?.StarterItems;
  const items: any[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? Object.values(raw)
      : [];
  if (items.length === 0) return;

  for (const item of items) {
    const info: Record<string, unknown> = {};
    if (item.item === 'id_card') {
      info.citizenid = citizenid;
      info.firstname = charinfo.firstname;
      info.lastname = charinfo.lastname;
      info.birthdate = charinfo.birthdate;
      info.gender = charinfo.gender;
      info.nationality = charinfo.nationality;
    } else if (item.item === 'driver_license') {
      info.firstname = charinfo.firstname;
      info.lastname = charinfo.lastname;
      info.birthdate = charinfo.birthdate;
      info.type = 'Class C Driver License';
    }
    (exports as any)['qb-inventory'].AddItem(
      src,
      item.item,
      item.amount,
      false,
      info,
      'qb-multicharacter:GiveStarterItems'
    );
  }
}

async function loadHouseData(src: number): Promise<void> {
  type HouseRow = {
    name: string;
    coords: string;
    owned: number;
    price: number;
    label: string;
    tier: number;
    garage: string | null;
  };
  const result = await query<HouseRow>('SELECT * FROM houselocations', []);

  const Houses: Record<string, unknown> = {};
  const HouseGarages: Record<string, unknown> = {};

  for (const v of result) {
    const garage = v.garage ? JSON.parse(v.garage) : {};
    Houses[v.name] = {
      coords: JSON.parse(v.coords),
      owned: Number(v.owned) === 1,
      price: v.price,
      locked: true,
      adress: v.label,
      tier: v.tier,
      garage,
      decorations: {},
    };
    HouseGarages[v.name] = { label: v.label, takeVehicle: garage };
  }

  emitNet('qb-garages:client:houseGarageConfig', src, HouseGarages);
  emitNet('qb-houses:client:setHouseConfig', src, Houses);
}

// ---------------- Commands ----------------

QBCore.Commands.Add(
  'logout',
  'Logout of Character (Admin Only)',
  [],
  false,
  (source: number) => {
    QBCore.Player.Logout(source);
    emitNet('qb-multicharacter:client:chooseChar', source);
  },
  'admin'
);

QBCore.Commands.Add(
  'closeNUI',
  'Close Multi NUI',
  [],
  false,
  (source: number) => {
    emitNet('qb-multicharacter:client:closeNUI', source);
  }
);

QBCore.Commands.Add(
  'deletechar',
  'Deletes another players character',
  [{ name: 'citizenid', help: 'The Citizen ID of the character you want to delete' }],
  false,
  (source: number, args: string[]) => {
    if (args && args[0]) {
      QBCore.Player.ForceDeleteCharacter(String(args[0]));
      emitNet(
        'QBCore:Notify',
        source,
        `You successfully deleted the character with citizen id ${args[0]}.`
      );
    } else {
      emitNet(
        'QBCore:Notify',
        source,
        'You forgot to input a citizen id!',
        'error'
      );
    }
  },
  'god'
);

// ---------------- QBCore lifecycle hooks ----------------

on('QBCore:Server:PlayerLoaded', async (Player: any) => {
  await sleep(1000);
  hasDonePreloading.set(Player.PlayerData.source, true);
});

on('QBCore:Server:OnPlayerUnload', (src: number) => {
  hasDonePreloading.set(src, false);
});

// ---------------- Client → server net events ----------------

onNet('qb-multicharacter:server:disconnect', () => {
  const src = (global as any).source as number;
  DropPlayer(String(src), 'You have disconnected from QBCore');
});

onNet('qb-multicharacter:server:loadUserData', async (cData: any) => {
  const src = (global as any).source as number;
  if (!QBCore.Player.Login(src, cData.citizenid)) return;

  await waitForPreloading(src);

  console.log(
    `^2[qb-core]^7 ${GetPlayerName(String(src))} (Citizen ID: ${cData.citizenid}) has successfully loaded!`
  );
  QBCore.Commands.Refresh(src);
  await safeLoadHouseData(src);

  if (Config.SkipSelection) {
    const coords = JSON.parse(cData.position);
    emitNet('qb-multicharacter:client:spawnLastLocation', src, coords, cData);
  } else {
    // Close qb-multicharacter's NUI BEFORE handing off to apartments/
    // spawn. Our React webview occupies the same right-column region
    // as qb-spawn's; if qb-multi stays mounted in its 'loading' state
    // it overlays qb-spawn and the player sees nothing happen even
    // though the spawn flow fires correctly.
    //
    // The upstream Lua qb-multicharacter doesn't do this — its Vue UI
    // is small enough not to overlap qb-spawn's top-left panel — but
    // the upstream-vs-port layout difference means we need the
    // explicit close here. The createCharacter+apartments path
    // already fires closeNUI for the same reason.
    emitNet('qb-multicharacter:client:closeNUI', src);
    if (GetResourceState('qb-apartments') === 'started') {
      emitNet('apartments:client:setupSpawnUI', src, cData);
    } else {
      emitNet('qb-spawn:client:setupSpawns', src, cData, false, null);
      emitNet('qb-spawn:client:openUI', src, true);
    }
  }

  const discord =
    QBCore.Functions.GetIdentifier(src, 'discord')?.replace('discord:', '') ??
    'unknown';
  const ip = QBCore.Functions.GetIdentifier(src, 'ip') ?? 'undefined';
  const license = QBCore.Functions.GetIdentifier(src, 'license') ?? 'undefined';
  emit(
    'qb-log:server:CreateLog',
    'joinleave',
    'Loaded',
    'green',
    `**${GetPlayerName(String(src))}** (<@${discord}> |  ||${ip}|| | ${license} | ${cData.citizenid} | ${src}) loaded..`
  );
});

onNet('qb-multicharacter:server:createCharacter', async (data: any) => {
  const src = (global as any).source as number;
  const newData = { cid: data.cid, charinfo: data };
  if (!QBCore.Player.Login(src, false, newData)) return;

  await waitForPreloading(src);

  // qb-apartments exposes `Apartments.Starting` via a shared script. We
  // can't `@qb-apartments/config.lua` from a JS bundle, so default to
  // the apartments path whenever the resource is started — that mirrors
  // the QBCore stock config (Apartments.Starting = true).
  if (GetResourceState('qb-apartments') === 'started') {
    const randbucket = `${GetPlayerPed(String(src))}${Math.floor(Math.random() * 999) + 1}`;
    SetPlayerRoutingBucket(String(src), Number(randbucket));
    console.log(`^2[qb-core]^7 ${GetPlayerName(String(src))} has successfully loaded!`);
    QBCore.Commands.Refresh(src);
    await safeLoadHouseData(src);
    emitNet('qb-multicharacter:client:closeNUI', src);
    emitNet('apartments:client:setupSpawnUI', src, newData);
    await giveStarterItems(src);
  } else {
    console.log(`^2[qb-core]^7 ${GetPlayerName(String(src))} has successfully loaded!`);
    QBCore.Commands.Refresh(src);
    await safeLoadHouseData(src);
    emitNet('qb-multicharacter:client:closeNUIdefault', src);
    await giveStarterItems(src);
    emit('apartments:client:SetHomeBlip', null);
  }
});

onNet('qb-multicharacter:server:deleteCharacter', (citizenid: string) => {
  const src = (global as any).source as number;
  if (!Config.EnableDeleteButton) return;
  QBCore.Player.DeleteCharacter(src, citizenid);
  emitNet('QBCore:Notify', src, 'Character deleted!', 'success');
});

// ---------------- QBCore callbacks (client → server with reply) ----------------

QBCore.Functions.CreateCallback(
  'qb-multicharacter:server:GetUserCharacters',
  async (source: number, cb: (rows: unknown) => void) => {
    const license = QBCore.Functions.GetIdentifier(source, 'license');
    const result = await query('SELECT * FROM players WHERE license = ?', [license]);
    cb(result);
  }
);

QBCore.Functions.CreateCallback(
  'qb-multicharacter:server:GetServerLogs',
  async (_source: number, cb: (rows: unknown) => void) => {
    const result = await query('SELECT * FROM server_logs', []);
    cb(result);
  }
);

QBCore.Functions.CreateCallback(
  'qb-multicharacter:server:GetNumberOfCharacters',
  (source: number, cb: (n: number, countries: string[]) => void) => {
    const license = QBCore.Functions.GetIdentifier(source, 'license');
    let numOfChars = Config.DefaultNumberOfCharacters;
    if (Config.PlayersNumberOfCharacters.length > 0) {
      const match = Config.PlayersNumberOfCharacters.find(
        (entry) => entry.license === license
      );
      if (match) numOfChars = match.numberOfChars;
    }
    cb(numOfChars, Countries);
  }
);

QBCore.Functions.CreateCallback(
  'qb-multicharacter:server:setupCharacters',
  async (source: number, cb: (rows: unknown) => void) => {
    const license = QBCore.Functions.GetIdentifier(source, 'license');
    type PlayerRow = {
      charinfo: string;
      money: string;
      job: string;
      [key: string]: unknown;
    };
    const result = await query<PlayerRow>(
      'SELECT * FROM players WHERE license = ?',
      [license]
    );
    const decoded = result.map((row) => ({
      ...row,
      charinfo: JSON.parse(row.charinfo),
      money: JSON.parse(row.money),
      job: JSON.parse(row.job),
    }));
    cb(decoded);
  }
);

QBCore.Functions.CreateCallback(
  'qb-multicharacter:server:getSkin',
  async (
    _source: number,
    cb: (model: string | null, data?: string) => void,
    cid: string
  ) => {
    type SkinRow = { model: string; skin: string };
    const result = await query<SkinRow>(
      'SELECT * FROM playerskins WHERE citizenid = ? AND active = ?',
      [cid, 1]
    );
    if (result[0]) {
      cb(result[0].model, result[0].skin);
    } else {
      cb(null);
    }
  }
);
