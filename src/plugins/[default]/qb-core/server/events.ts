/// <reference types="@citizenfx/server" />

// Direct port of qb-core/server/events.lua. With one *intentional*
// divergence from upstream, called out in line: the `playerDropped`
// handler now fires `QBCore:Server:OnPlayerUnload` so downstream
// resources hooking unload events get notified on hard disconnects
// (not just on the explicit `/logout` admin command). Upstream's
// asymmetry — `playerDropped` does Save+map-clear but never fires
// unload — silently leaks per-player state in any plugin that
// relies on OnPlayerUnload for cleanup. We document this as the
// u-core fix for the disconnect-stale-session bug class.

import type { QBCoreShape } from './qbcore';
import type { QBPlayer } from './player';
import { Lang } from '../shared/lang';

const oxmysql = (exports as any).oxmysql;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function installEvents(QBCore: QBCoreShape): void {
  const Players = QBCore.Players as Record<number, QBPlayer>;
  const PlayerBuckets = QBCore.Player_Buckets as Record<
    string,
    { id: number; bucket: number }
  >;
  const UsableItems = QBCore.UsableItems as Record<
    string,
    { resource?: string; cb: unknown }
  >;
  const ClientCallbacks = QBCore.ClientCallbacks as Record<
    string,
    {
      callback?: (...args: unknown[]) => void;
      promise?: { resolve?: (v: unknown) => void };
    }
  >;
  const ServerCallbacks = QBCore.ServerCallbacks as Record<
    string,
    (
      src: number,
      cb: (...vals: unknown[]) => void,
      ...args: unknown[]
    ) => void
  >;
  const Functions = QBCore.Functions as any;

  // ---------- Track database/bans-table readiness ----------
  // Upstream uses MySQL.ready(callback) to know when the connection
  // is up. oxmysql doesn't expose an equivalent here; we treat the
  // database as ready once a probe query succeeds, then check for
  // the bans table. Same gating as upstream — if either check fails
  // we surface the readable error in the deferral.

  let databaseConnected = false;
  let bansTableExists = false;

  void (async () => {
    try {
      const dbInfo = Functions.GetDatabaseInfo() as {
        exists: boolean;
        database: string;
      };
      if (!dbInfo?.exists) return;
      // A simple probe to confirm the connection is up.
      await oxmysql.scalar_async('SELECT 1');
      databaseConnected = true;
      const result = await oxmysql.query_async(
        'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = "bans";',
        [dbInfo.database]
      );
      if (result && result[0]) bansTableExists = true;
    } catch {
      // Leave both flags false; deferrals will surface the error.
    }
  })();

  // ---------- chatMessage: swallow leading-slash so commands fall
  //   through to the dedicated handler instead of broadcasting. ----------

  on('chatMessage', (_src: number, _name: string, message: string) => {
    if (typeof message === 'string' && message.startsWith('/')) {
      (globalThis as any).CancelEvent();
    }
  });

  // ---------- playerDropped — the FIX for disconnect-stale-session ----------

  on('playerDropped', async (reason: string) => {
    const src = (global as any).source as number;
    const player = Players[src];
    if (!player) return;

    emit(
      'qb-log:server:CreateLog',
      'joinleave',
      'Dropped',
      'red',
      `**${GetPlayerName(String(src))}** (${player.PlayerData.license}) left..\n **Reason:** ${reason}`
    );
    emit('QBCore:Server:PlayerDropped', player);

    // Fire-and-forget Save — match upstream's pattern. Player.Save
    // reads `Players[source]?.PlayerData` synchronously on entry and
    // captures it into a local before awaiting the SQL, so deleting
    // Players[src] immediately after invoking Save() doesn't lose
    // data — the in-flight oxmysql call still has the captured
    // PlayerData in its closure.
    //
    // The earlier draft awaited Save here. That held the player in
    // the Players[] map for the full duration of the SQL round-trip
    // (5-10s on cold oxmysql). During that window, a fast reconnect
    // would hit `IsLicenseInUse(license)` in playerConnecting and
    // get rejected as duplicate-license — symptom: "first reconnect
    // attempt fails, retry works." Removing the await closes that
    // race.
    void (QBCore.Player as any).Save(src);

    // u-core divergence from upstream: also fire `OnPlayerUnload`
    // events on hard disconnect. Upstream skips this — only the
    // explicit `/logout` command runs Player.Logout — which means
    // any plugin hooking OnPlayerUnload to clean up per-player
    // state silently leaks on a normal disconnect. Firing it here
    // closes that asymmetry. The client event is a dead-letter
    // because the player has already left, but FXServer drops it
    // gracefully and downstream client cleanup that matters has
    // already happened on the client side.
    emit('QBCore:Server:OnPlayerUnload', src);

    delete PlayerBuckets[player.PlayerData.license];
    delete Players[src];
  });

  // ---------- onResourceStop — clear UsableItems registered by the
  //   stopping resource so reload doesn't leak stale callbacks. ----------

  on('onResourceStop', (resName: string) => {
    for (const [item, entry] of Object.entries(UsableItems)) {
      if (entry?.resource === resName) {
        delete UsableItems[item];
      }
    }
  });

  // ---------- playerConnecting — license/whitelist/ban gate ----------

  on(
    'playerConnecting',
    async (
      name: string,
      _setKickReason: (r: string) => void,
      deferrals: {
        defer: () => void;
        update: (msg: string) => void;
        done: (reason?: string) => void;
      }
    ) => {
      const src = (global as any).source as number;
      deferrals.defer();
      // Yield once so the deferrals.defer() call is committed before
      // we touch deferrals.update / .done — required by FXServer.
      await sleep(0);

      if (
        QBCore.Config.Server.Closed &&
        !IsPlayerAceAllowed(String(src), 'qbadmin.join')
      ) {
        deferrals.done(QBCore.Config.Server.ClosedReason);
        return;
      }

      if (!databaseConnected) {
        deferrals.done(Lang.t('error.connecting_database_error'));
        return;
      }

      if (QBCore.Config.Server.Whitelist) {
        await sleep(0);
        deferrals.update(
          Lang.t('info.checking_whitelisted').replace('%s', name)
        );
        if (!Functions.IsWhitelisted(src)) {
          deferrals.done(Lang.t('error.not_whitelisted'));
          return;
        }
      }

      await sleep(0);
      deferrals.update(`Hello ${name}. Your license is being checked`);
      const license = Functions.GetIdentifier(src, 'license') as
        | string
        | undefined;

      if (!license) {
        deferrals.done(Lang.t('error.no_valid_license'));
        return;
      }
      if (
        QBCore.Config.Server.CheckDuplicateLicense &&
        Functions.IsLicenseInUse(license)
      ) {
        deferrals.done(Lang.t('error.duplicate_license'));
        return;
      }

      await sleep(0);
      deferrals.update(Lang.t('info.checking_ban').replace('%s', name));
      if (!bansTableExists) {
        deferrals.done(Lang.t('error.ban_table_not_found'));
        return;
      }

      try {
        const banResult = (await Functions.IsPlayerBanned(src)) as [
          boolean,
          string?
        ];
        if (banResult[0]) {
          deferrals.done(banResult[1] ?? 'You are banned from this server');
          return;
        }
      } catch {
        deferrals.done(Lang.t('error.connecting_database_error'));
        return;
      }

      await sleep(0);
      deferrals.update(Lang.t('info.join_server').replace('%s', name));
      deferrals.done();

      emitNet('QBCore:Client:SharedUpdate', src, QBCore.Shared);
    }
  );

  // ---------- Open / close server (admin gated) ----------

  onNet('QBCore:Server:CloseServer', (reason?: string) => {
    const src = (global as any).source as number;
    if (Functions.HasPermission(src, 'admin')) {
      const r = reason ?? 'No reason specified';
      QBCore.Config.Server.Closed = true;
      QBCore.Config.Server.ClosedReason = r;
      for (const k of Object.keys(Players)) {
        const id = Number(k);
        if (
          !Functions.HasPermission(id, QBCore.Config.Server.WhitelistPermission)
        ) {
          Functions.Kick(id, r, undefined, undefined);
        }
      }
    } else {
      Functions.Kick(src, Lang.t('error.no_permission'), undefined, undefined);
    }
  });

  onNet('QBCore:Server:OpenServer', () => {
    const src = (global as any).source as number;
    if (Functions.HasPermission(src, 'admin')) {
      QBCore.Config.Server.Closed = false;
    } else {
      Functions.Kick(src, Lang.t('error.no_permission'), undefined, undefined);
    }
  });

  // ---------- Callback events ----------

  // Client → Server response to a TriggerClientCallback invocation.
  onNet(
    'QBCore:Server:TriggerClientCallback',
    (name: string, ...rest: unknown[]) => {
      const src = (global as any).source as number;
      const key = name + src;
      const cb = ClientCallbacks[key];
      if (cb) {
        // Resolve the await-mode Promise (registered when caller
        // omitted `cb`). Same pattern client/events.ts uses for
        // QBCore:Client:TriggerCallback. Without this, every
        // `await TriggerClientCallback(...)` would hang forever.
        cb.promise?.resolve?.(rest.length === 1 ? rest[0] : rest);
        if (cb.callback) cb.callback(...rest);
        delete ClientCallbacks[key];
      }
    }
  );

  // Client → Server callback request (the inverse — client calls a
  // server callback registered via QBCore.Functions.CreateCallback).
  onNet(
    'QBCore:Server:TriggerCallback',
    (name: string, ...args: unknown[]) => {
      const src = (global as any).source as number;
      const cb = ServerCallbacks[name];
      if (!cb) return;
      cb(
        src,
        (...vals: unknown[]) => {
          emitNet('QBCore:Client:TriggerCallback', src, name, ...vals);
        },
        ...args
      );
    }
  );

  // ---------- Player periodic updates ----------

  onNet('QBCore:UpdatePlayer', () => {
    const src = (global as any).source as number;
    const player = Functions.GetPlayer(src) as QBPlayer | undefined;
    if (!player) return;
    const newHunger = Math.max(
      0,
      (player.PlayerData.metadata.hunger as number) -
        QBCore.Config.Player.HungerRate
    );
    const newThirst = Math.max(
      0,
      (player.PlayerData.metadata.thirst as number) -
        QBCore.Config.Player.ThirstRate
    );
    player.Functions.SetMetaData('thirst', newThirst);
    player.Functions.SetMetaData('hunger', newHunger);
    emitNet('hud:client:UpdateNeeds', src, newHunger, newThirst);
    player.Functions.Save();
  });

  onNet('QBCore:ToggleDuty', () => {
    const src = (global as any).source as number;
    const player = Functions.GetPlayer(src) as QBPlayer | undefined;
    if (!player) return;
    if (player.PlayerData.job.onduty) {
      player.Functions.SetJobDuty(false);
      emitNet('QBCore:Notify', src, Lang.t('info.off_duty'));
    } else {
      player.Functions.SetJobDuty(true);
      emitNet('QBCore:Notify', src, Lang.t('info.on_duty'));
    }
    emit('QBCore:Server:SetDuty', src, player.PlayerData.job.onduty);
    emitNet('QBCore:Client:SetDuty', src, player.PlayerData.job.onduty);
  });

  // ---------- Vehicle base-events relay ----------

  on(
    'baseevents:enteringVehicle',
    (veh: number, seat: number, modelName: string) => {
      const src = (global as any).source as number;
      emitNet('QBCore:Client:VehicleInfo', src, {
        vehicle: veh,
        seat,
        name: modelName,
        event: 'Entering',
      });
    }
  );

  on(
    'baseevents:enteredVehicle',
    (veh: number, seat: number, modelName: string) => {
      const src = (global as any).source as number;
      emitNet('QBCore:Client:VehicleInfo', src, {
        vehicle: veh,
        seat,
        name: modelName,
        event: 'Entered',
      });
    }
  );

  on('baseevents:enteringAborted', () => {
    const src = (global as any).source as number;
    emitNet('QBCore:Client:AbortVehicleEntering', src);
  });

  on(
    'baseevents:leftVehicle',
    (veh: number, seat: number, modelName: string) => {
      const src = (global as any).source as number;
      emitNet('QBCore:Client:VehicleInfo', src, {
        vehicle: veh,
        seat,
        name: modelName,
        event: 'Left',
      });
    }
  );

  // ---------- Deprecated item-mutation events kept for log-and-noop ----------
  // Upstream prints a deprecation warning and does nothing; we mirror
  // exactly so downstream resources still loading these handlers
  // produce identical console output.

  onNet('QBCore:Server:UseItem', (item: unknown) => {
    const src = (global as any).source as number;
    console.log(
      `${GetInvokingResource()} triggered QBCore:Server:UseItem by ID ${src} with the following data. This event is deprecated due to exploitation, and will be removed soon. Check qb-inventory for the right use on this event.`
    );
    // Match upstream: also dump the item payload via QBCore.Debug.
    // Upstream's deprecation pass prints the message AND the item so
    // server admins can see what's being attempted; the earlier
    // draft dropped the item payload, hiding exploit attempts.
    (QBCore as any).Debug?.(item);
  });

  onNet('QBCore:Server:RemoveItem', (itemName: string, amount: number) => {
    const src = (global as any).source as number;
    console.log(
      `${GetInvokingResource()} triggered QBCore:Server:RemoveItem by ID ${src} for ${amount} ${itemName}. This event is deprecated due to exploitation, and will be removed soon. Adjust your events accordingly to do this server side with player functions.`
    );
  });

  onNet('QBCore:Server:AddItem', (itemName: string, amount: number) => {
    const src = (global as any).source as number;
    console.log(
      `${GetInvokingResource()} triggered QBCore:Server:AddItem by ID ${src} for ${amount} ${itemName}. This event is deprecated due to exploitation, and will be removed soon. Adjust your events accordingly to do this server side with player functions.`
    );
  });

  // ---------- Non-chat command calling (qb-adminmenu pattern) ----------

  onNet('QBCore:CallCommand', (command: string, args: unknown[]) => {
    const src = (global as any).source as number;
    const list = (QBCore.Commands as any).List as Record<string, any>;
    if (!list[command]) return;
    const player = Functions.GetPlayer(src) as QBPlayer | undefined;
    if (!player) return;
    const hasPerm = Functions.HasPermission(
      src,
      `command.${list[command].name}`
    );
    if (hasPerm) {
      const cmd = list[command];
      if (
        cmd.argsrequired &&
        Array.isArray(cmd.arguments) &&
        cmd.arguments.length !== 0 &&
        !(args as any)[cmd.arguments.length - 1]
      ) {
        emitNet(
          'QBCore:Notify',
          src,
          Lang.t('error.missing_args2'),
          'error'
        );
      } else {
        cmd.callback(src, args);
      }
    } else {
      emitNet('QBCore:Notify', src, Lang.t('error.no_access'), 'error');
    }
  });

  // ---------- Vehicle-spawn callbacks ----------

  Functions.CreateCallback(
    'QBCore:Server:SpawnVehicle',
    async (
      source: number,
      cb: (netId: number) => void,
      model: string | number,
      coords: { x: number; y: number; z: number; w?: number },
      warp?: boolean
    ) => {
      const veh = await Functions.SpawnVehicle(source, model, coords, warp);
      cb(NetworkGetNetworkIdFromEntity(veh));
    }
  );

  Functions.CreateCallback(
    'QBCore:Server:CreateVehicle',
    async (
      source: number,
      cb: (netId: number) => void,
      model: string | number,
      coords: { x: number; y: number; z: number; w?: number },
      warp?: boolean
    ) => {
      // Phase 2b doesn't expose CreateAutomobile (it's a niche
      // upstream native that doesn't work for all vehicles);
      // CreateVehicle is the more reliable path. Match upstream's
      // signature by calling our CreateVehicle without vehtype —
      // FXServer's `CreateVehicleServerSetter` only requires
      // vehtype for non-automobile vehicles. Default to 'automobile'
      // since that's the common case the upstream callback is
      // wired for.
      const veh = await Functions.CreateVehicle(
        source,
        model,
        'automobile',
        coords,
        warp
      );
      cb(NetworkGetNetworkIdFromEntity(veh));
    }
  );
}
