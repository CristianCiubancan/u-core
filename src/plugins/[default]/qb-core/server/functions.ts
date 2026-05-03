/// <reference types="@citizenfx/server" />

// Direct port of qb-core/server/functions.lua.
//
// `installFunctions(QBCore)` attaches all the helper functions to
// QBCore.Functions, replacing the throw-on-call stubs from
// qbcore.ts. Each function preserves the upstream signature as
// closely as cross-language exports allow:
//   - Lua `nil` becomes JS `undefined`/`null` interchangeably (we
//     return undefined; Lua callers see nil either way through the
//     FXServer marshaller).
//   - Lua multi-returns (`return players, count`) become tuple
//     arrays in JS callers; the export marshaller flattens them
//     back into Lua multi-returns when called from Lua. The Lua
//     side keeps working as long as we *return* the tuple in the
//     same order upstream did.
//
// Functions that depend on Player object methods (AddMoney, etc.)
// will return reasonable empty/false results until Phase 2c lands
// CreatePlayer — at which point the Players map starts holding
// real entries and these getters become effectful.

import type { QBCoreShape } from './qbcore';

const oxmysql = (exports as any).oxmysql;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface XYZW { x: number; y: number; z: number; w: number; }
interface XYZ { x: number; y: number; z: number; }

interface QBPlayer {
  PlayerData: {
    source: number;
    citizenid: string;
    license: string;
    optin?: boolean;
    charinfo: {
      phone?: number | string;
      account?: string;
      [key: string]: unknown;
    };
    job: {
      name: string;
      type?: string;
      onduty: boolean;
      grade: { level: number };
    };
    [key: string]: unknown;
  };
  Functions: {
    SetPlayerData: (key: string, value: unknown) => void;
    [key: string]: unknown;
  };
}

interface BucketEntry { id: number; bucket: number; }

export function installFunctions(QBCore: QBCoreShape): void {
  const Functions = QBCore.Functions as Record<string, unknown>;
  const Players = QBCore.Players as Record<number, QBPlayer>;
  const PlayerBuckets = QBCore.Player_Buckets as Record<string, BucketEntry>;
  const EntityBuckets = QBCore.Entity_Buckets as Record<number, BucketEntry>;

  // ---------- Coords / identifier helpers ----------

  Functions.GetCoords = (entity: number): XYZW => {
    const c = GetEntityCoords(entity);
    const heading = GetEntityHeading(entity);
    return { x: c[0], y: c[1], z: c[2], w: heading };
  };

  Functions.GetIdentifier = (source: number, idtype = 'license'): string | undefined => {
    if (GetConvarInt('sv_fxdkMode', 0) === 1) return 'license:fxdk';
    return GetPlayerIdentifierByType(String(source), idtype) || undefined;
  };

  Functions.GetSource = (identifier: string): number => {
    for (const srcKey of Object.keys(Players)) {
      const src = Number(srcKey);
      const ids = GetPlayerIdentifiers(String(src));
      for (let i = 0; i < ids.length; i++) {
        if (ids[i] === identifier) return src;
      }
    }
    return 0;
  };

  // ---------- Player lookups ----------

  Functions.GetPlayer = (source: number | string): QBPlayer | undefined => {
    const asNum = typeof source === 'string' ? Number(source) : source;
    if (Number.isFinite(asNum)) {
      return Players[asNum as number];
    }
    return Players[(Functions.GetSource as (id: string) => number)(String(source))];
  };

  Functions.GetPlayerByCitizenId = (citizenid: string): QBPlayer | undefined => {
    for (const p of Object.values(Players)) {
      if (p.PlayerData.citizenid === citizenid) return p;
    }
    return undefined;
  };

  Functions.GetOfflinePlayerByCitizenId = (citizenid: string): unknown => {
    const getOffline = (QBCore.Player as any).GetOfflinePlayer;
    return typeof getOffline === 'function' ? getOffline(citizenid) : undefined;
  };

  Functions.GetPlayerByLicense = (license: string): unknown => {
    const fn = (QBCore.Player as any).GetPlayerByLicense;
    return typeof fn === 'function' ? fn(license) : undefined;
  };

  Functions.GetPlayerByPhone = (number: number | string): QBPlayer | undefined => {
    for (const p of Object.values(Players)) {
      if (p.PlayerData.charinfo.phone === number) return p;
    }
    return undefined;
  };

  Functions.GetPlayerByAccount = (account: string): QBPlayer | undefined => {
    for (const p of Object.values(Players)) {
      if (p.PlayerData.charinfo.account === account) return p;
    }
    return undefined;
  };

  Functions.GetPlayerByCharInfo = (property: string, value: unknown): QBPlayer | undefined => {
    for (const p of Object.values(Players)) {
      const ci = p.PlayerData.charinfo as Record<string, unknown>;
      if (ci[property] !== undefined && ci[property] === value) return p;
    }
    return undefined;
  };

  Functions.GetPlayers = (): number[] =>
    Object.keys(Players).map((k) => Number(k));

  Functions.GetQBPlayers = (): Record<number, QBPlayer> => Players;

  Functions.GetPlayersByJob = (
    job: string,
    checkOnDuty?: boolean
  ): [number[], number] => {
    const players: number[] = [];
    let count = 0;
    for (const [srcKey, p] of Object.entries(Players)) {
      const j = p.PlayerData.job;
      if (j.name === job || j.type === job) {
        if (checkOnDuty) {
          if (j.onduty) {
            players.push(Number(srcKey));
            count++;
          }
        } else {
          players.push(Number(srcKey));
          count++;
        }
      }
    }
    return [players, count];
  };

  Functions.GetPlayersOnDuty = (job: string): [number[], number] =>
    (Functions.GetPlayersByJob as (j: string, cd: boolean) => [number[], number])(
      job,
      true
    );

  Functions.GetDutyCount = (job: string): number => {
    const [, count] = (Functions.GetPlayersByJob as (
      j: string,
      cd: boolean
    ) => [number[], number])(job, true);
    return count;
  };

  // ---------- Closest-entity helpers (server natives — not all client
  // natives exist server-side; fall back to GetAll* where available). ----------

  function distance(a: number[], b: number[]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function resolveCoords(source: number, coords?: XYZ | number[]): number[] {
    if (coords) {
      if (Array.isArray(coords)) return coords;
      return [coords.x, coords.y, coords.z];
    }
    const ped = GetPlayerPed(String(source));
    return GetEntityCoords(ped) as unknown as number[];
  }

  Functions.GetClosestPlayer = (source: number, coords?: XYZ): [number, number] => {
    const ped = GetPlayerPed(String(source));
    const target = resolveCoords(source, coords);
    let closestPlayer = -1;
    let closestDist = -1;
    const players = getPlayers();
    for (const idStr of players) {
      const playerPed = GetPlayerPed(idStr);
      if (playerPed !== ped) {
        const pc = GetEntityCoords(playerPed) as unknown as number[];
        const d = distance(pc, target);
        if (closestDist === -1 || d < closestDist) {
          closestPlayer = Number(idStr);
          closestDist = d;
        }
      }
    }
    return [closestPlayer, closestDist];
  };

  // The other Closest* helpers (Object/Vehicle/Ped) rely on
  // GetAllObjects / GetAllVehicles / GetAllPeds which are client-only
  // natives. Server-side QBCore exposes them but they no-op without
  // those natives — leave them as not-yet-ported stubs. Most callers
  // are client-side anyway and Phase 3 will provide the client port.

  // ---------- Routing buckets ----------

  Functions.GetBucketObjects = (): [Record<string, BucketEntry>, Record<number, BucketEntry>] => [
    PlayerBuckets,
    EntityBuckets,
  ];

  Functions.SetPlayerBucket = (source: number, bucket: number): boolean => {
    if (!source || bucket === undefined || bucket === null) return false;
    const license = (Functions.GetIdentifier as (s: number, t?: string) => string | undefined)(
      source,
      'license'
    );
    if (!license) return false;
    // `Player(source).state:set('instance', bucket, true)` — the JS
    // statebag access is via the global Player function which exists
    // server-side. Wrap defensively.
    try {
      const p = (globalThis as any).Player(source);
      if (p && p.state && typeof p.state.set === 'function') {
        p.state.set('instance', bucket, true);
      }
    } catch {
      /* noop */
    }
    SetPlayerRoutingBucket(String(source), bucket);
    PlayerBuckets[license] = { id: source, bucket };
    return true;
  };

  Functions.SetEntityBucket = (entity: number, bucket: number): boolean => {
    if (!entity || bucket === undefined || bucket === null) return false;
    SetEntityRoutingBucket(entity, bucket);
    EntityBuckets[entity] = { id: entity, bucket };
    return true;
  };

  Functions.GetPlayersInBucket = (bucket: number): number[] | false => {
    const pool: number[] = [];
    let any = false;
    for (const v of Object.values(PlayerBuckets)) {
      any = true;
      if (v.bucket === bucket) pool.push(v.id);
    }
    return any ? pool : false;
  };

  Functions.GetEntitiesInBucket = (bucket: number): number[] | false => {
    const pool: number[] = [];
    let any = false;
    for (const v of Object.values(EntityBuckets)) {
      any = true;
      if (v.bucket === bucket) pool.push(v.id);
    }
    return any ? pool : false;
  };

  // ---------- Vehicle helpers ----------

  function modelHash(model: string | number): number {
    return typeof model === 'string' ? GetHashKey(model) : model;
  }

  Functions.SpawnVehicle = async (
    source: number,
    model: string | number,
    coords?: XYZW,
    warp?: boolean
  ): Promise<number> => {
    const ped = GetPlayerPed(String(source));
    const m = modelHash(model);
    const c = coords ?? {
      ...(GetEntityCoords(ped) as unknown as { x: number; y: number; z: number }),
      w: 0,
    };
    const heading = c.w ?? 0;
    const veh = CreateVehicle(m, c.x, c.y, c.z, heading, true, true);
    while (!DoesEntityExist(veh)) await sleep(0);
    if (warp) {
      while (GetVehiclePedIsIn(ped, false) !== veh) {
        await sleep(0);
        TaskWarpPedIntoVehicle(ped, veh, -1);
      }
    }
    while (NetworkGetEntityOwner(veh) !== source) await sleep(0);
    return veh;
  };

  Functions.CreateVehicle = async (
    source: number,
    model: string | number,
    vehtype: string,
    coords?: XYZW,
    warp?: boolean
  ): Promise<number> => {
    const m = modelHash(model);
    const c = coords ?? {
      ...(GetEntityCoords(GetPlayerPed(String(source))) as unknown as {
        x: number;
        y: number;
        z: number;
      }),
      w: 0,
    };
    const heading = c.w ?? 0;
    const veh = (CreateVehicleServerSetter as unknown as (...a: unknown[]) => number)(
      m,
      vehtype,
      c.x,
      c.y,
      c.z,
      heading
    );
    while (!DoesEntityExist(veh)) await sleep(0);
    if (warp) TaskWarpPedIntoVehicle(GetPlayerPed(String(source)), veh, -1);
    return veh;
  };

  // ---------- Callbacks ----------

  Functions.TriggerClientCallback = (
    name: string,
    source: number,
    cb: (...args: unknown[]) => void,
    ...args: unknown[]
  ): void => {
    if (!source) return;
    const key = name + source;
    const ClientCallbacks = QBCore.ClientCallbacks as Record<string, unknown>;
    ClientCallbacks[key] = { callback: cb };
    emitNet('QBCore:Client:TriggerClientCallback', source, name, ...args);
  };

  Functions.CreateCallback = (
    name: string,
    cb: (...args: unknown[]) => void
  ): void => {
    (QBCore.ServerCallbacks as Record<string, unknown>)[name] = cb;
  };

  // ---------- Items ----------

  Functions.CreateUseableItem = (
    item: string,
    data: ((source: number, item: unknown) => void) | { cb?: unknown; callback?: unknown }
  ): void => {
    let func: unknown = null;
    if (typeof data === 'function') {
      func = data;
    } else if (typeof data === 'object' && data !== null) {
      // The Lua port checks for `__cfx_functionReference` to identify
      // function-typed values that crossed the JS/Lua boundary. We
      // pass through whatever's in `data.cb`, `data.callback`, or
      // `data` itself.
      func =
        (data as any).__cfx_functionReference !== undefined
          ? data
          : (data as any).cb ?? (data as any).callback ?? null;
    }
    if (func) {
      QBCore.UsableItems[item] = {
        cb: func,
        resource: GetInvokingResource() ?? undefined,
      };
    }
  };

  Functions.CanUseItem = (item: string): unknown => QBCore.UsableItems[item];

  Functions.UseItem = (source: number, item: string): void => {
    if (GetResourceState('qb-inventory') === 'missing') return;
    (exports as any)['qb-inventory'].UseItem(source, item);
  };

  Functions.HasItem = (source: number, items: string | string[], amount?: number): boolean => {
    if (GetResourceState('qb-inventory') === 'missing') return false;
    return (exports as any)['qb-inventory'].HasItem(source, items, amount);
  };

  // ---------- Permissions / whitelist ----------

  Functions.HasPermission = (source: number, permission: string | string[]): boolean => {
    if (typeof permission === 'string') {
      return IsPlayerAceAllowed(String(source), permission);
    }
    if (Array.isArray(permission)) {
      for (const p of permission) {
        if (IsPlayerAceAllowed(String(source), p)) return true;
      }
    }
    return false;
  };

  Functions.GetPermission = (source: number): Record<string, true> => {
    const perms: Record<string, true> = {};
    for (const v of QBCore.Config.Server.Permissions) {
      if (IsPlayerAceAllowed(String(source), v)) perms[v] = true;
    }
    return perms;
  };

  Functions.IsWhitelisted = (source: number): boolean => {
    if (!QBCore.Config.Server.Whitelist) return true;
    return (Functions.HasPermission as (s: number, p: string) => boolean)(
      source,
      QBCore.Config.Server.WhitelistPermission
    );
  };

  Functions.AddPermission = (source: number, permission: string): void => {
    if (!IsPlayerAceAllowed(String(source), permission)) {
      ExecuteCommand(`add_principal player.${source} qbcore.${permission}`);
      const refresh = (QBCore.Commands as any).Refresh;
      if (typeof refresh === 'function') refresh(source);
    }
  };

  Functions.RemovePermission = (source: number, permission?: string): void => {
    const refresh = (QBCore.Commands as any).Refresh;
    if (permission) {
      if (IsPlayerAceAllowed(String(source), permission)) {
        ExecuteCommand(`remove_principal player.${source} qbcore.${permission}`);
        if (typeof refresh === 'function') refresh(source);
      }
      return;
    }
    for (const v of QBCore.Config.Server.Permissions) {
      if (IsPlayerAceAllowed(String(source), v)) {
        ExecuteCommand(`remove_principal player.${source} qbcore.${v}`);
        if (typeof refresh === 'function') refresh(source);
      }
    }
  };

  Functions.IsOptin = (source: number): boolean => {
    const license = (Functions.GetIdentifier as (s: number, t?: string) => string | undefined)(
      source,
      'license'
    );
    if (
      !license ||
      !(Functions.HasPermission as (s: number, p: string) => boolean)(source, 'admin')
    )
      return false;
    const Player = (Functions.GetPlayer as (s: number) => QBPlayer | undefined)(source);
    return !!Player?.PlayerData.optin;
  };

  Functions.ToggleOptin = (source: number): void => {
    const license = (Functions.GetIdentifier as (s: number, t?: string) => string | undefined)(
      source,
      'license'
    );
    if (
      !license ||
      !(Functions.HasPermission as (s: number, p: string) => boolean)(source, 'admin')
    )
      return;
    const Player = (Functions.GetPlayer as (s: number) => QBPlayer | undefined)(source);
    if (!Player) return;
    Player.PlayerData.optin = !Player.PlayerData.optin;
    Player.Functions.SetPlayerData('optin', Player.PlayerData.optin);
  };

  // ---------- Ban check ----------

  Functions.IsPlayerBanned = async (source: number): Promise<[boolean, string?]> => {
    const license = (Functions.GetIdentifier as (s: number, t?: string) => string | undefined)(
      source,
      'license'
    );
    if (!license) return [false];
    const result = await oxmysql.single_async(
      'SELECT id, reason, expire FROM bans WHERE license = ?',
      [license]
    );
    if (!result) return [false];
    const expire = Number(result.expire);
    if (Date.now() / 1000 < expire) {
      const d = new Date(expire * 1000);
      const formatted = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d
        .getHours()
        .toString()
        .padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      return [
        true,
        `You have been banned from the server:\n${result.reason}\nYour ban expires ${formatted}\n`,
      ];
    }
    await oxmysql.query_async('DELETE FROM bans WHERE id = ?', [result.id]);
    return [false];
  };

  // ---------- Database ----------

  Functions.GetDatabaseInfo = (): { exists: boolean; database: string } => {
    const out = { exists: false, database: '' };
    let conn = GetConvar('mysql_connection_string', '');
    if (!conn) return out;
    if (conn.startsWith('mysql://')) {
      conn = conn.slice(8);
      const slashIdx = conn.indexOf('/');
      if (slashIdx === -1) return out;
      let db = conn.slice(slashIdx + 1);
      const qIdx = db.indexOf('?');
      if (qIdx >= 0) db = db.slice(0, qIdx);
      out.database = db;
      out.exists = true;
      return out;
    }
    for (const segment of conn.split(';')) {
      if (segment.startsWith('database')) {
        out.database = segment.slice('database='.length);
        out.exists = true;
        return out;
      }
    }
    return out;
  };

  Functions.IsLicenseInUse = (license: string): boolean => {
    const players = getPlayers();
    for (const idStr of players) {
      const playerLicense = GetPlayerIdentifierByType(idStr, 'license');
      if (playerLicense === license) return true;
    }
    return false;
  };

  // ---------- Notify / Kick / SQL guard ----------

  Functions.Notify = (
    source: number,
    text: string,
    type?: string,
    length?: number
  ): void => {
    emitNet('QBCore:Notify', source, text, type, length);
  };

  Functions.Kick = (
    source: number,
    reason: string,
    setKickReason?: (r: string) => void,
    deferrals?: { update: (m: string) => void }
  ): void => {
    const fullReason = `\n${reason}\n🔸 Check our Discord for further information: ${QBCore.Config.Server.Discord}`;
    if (setKickReason) setKickReason(fullReason);
    void (async () => {
      if (deferrals) {
        deferrals.update(fullReason);
        await sleep(2500);
      }
      if (source) DropPlayer(String(source), fullReason);
      // Upstream loops 5 times trying to ensure the drop sticks. We
      // mirror that — if the player is somehow still there with a
      // valid ping, drop them again.
      for (let attempt = 0; attempt < 5; attempt++) {
        if (!source) break;
        if (GetPlayerPing(String(source)) >= 0) {
          DropPlayer(String(source), fullReason);
        } else {
          break;
        }
        await sleep(5000);
      }
    })();
  };

  Functions.PrepForSQL = (
    source: number,
    data: unknown,
    pattern: string
  ): boolean => {
    const dataStr = String(data);
    const re = new RegExp(pattern);
    const m = dataStr.match(re);
    if (!m || m[0].length !== dataStr.length) {
      const Player = (Functions.GetPlayer as (s: number) => QBPlayer | undefined)(source);
      const license = Player?.PlayerData.license ?? 'unknown';
      emit(
        'qb-log:server:CreateLog',
        'anticheat',
        'SQL Exploit Attempted',
        'red',
        `${license} attempted to exploit SQL!`
      );
      return false;
    }
    return true;
  };

  // ---------- Phone / account number generators (used by config
  //   PlayerDefaults — exposed here so player.ts can call them
  //   when CreatePlayer needs lazy defaults). ----------

  Functions.CreatePhoneNumber = (): string => {
    // 4xx-xxxx format (matches upstream qb-core convention)
    const part = (n: number) => Math.floor(Math.random() * Math.pow(10, n))
      .toString()
      .padStart(n, '0');
    return `${part(3)}-${part(4)}`;
  };

  Functions.CreateAccountNumber = (): string => {
    // QB-XXXXXX-XXXX (Mastercard-ish format upstream uses)
    const digits = (n: number) =>
      Math.floor(Math.random() * Math.pow(10, n))
        .toString()
        .padStart(n, '0');
    return `QB-${digits(6)}-${digits(4)}`;
  };
}

/** Returns the live list of player source IDs (FXServer's `GetPlayers`
 *  global). Wrapped because the global signature is `() => string[]`
 *  and we want to keep call sites tidy. */
function getPlayers(): string[] {
  return (globalThis as any).GetPlayers() as string[];
}
