/// <reference types="@citizenfx/client" />

// Direct port of qb-core/client/events.lua. Player load/unload state
// management, command-driven teleports, vehicle base events,
// callback bridges, and Shared snapshot updates from the server.

import type { QBCoreClient } from './qbcore';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function installClientEvents(QBCore: QBCoreClient): void {
  const Functions = QBCore.Functions as Record<string, any>;

  // ---------- Player load/unload — drives `LocalPlayer.state.isLoggedIn` ----------

  onNet('QBCore:Client:OnPlayerLoaded', () => {
    ShutdownLoadingScreenNui();
    (LocalPlayer as any).state.set('isLoggedIn', true, false);
    if (!QBCore.Config.Server.PVP) return;
    SetCanAttackFriendly(PlayerPedId(), true, false);
    NetworkSetFriendlyFireOption(true);
  });

  onNet('QBCore:Client:OnPlayerUnload', () => {
    (LocalPlayer as any).state.set('isLoggedIn', false, false);
  });

  onNet('QBCore:Client:PvpHasToggled', (pvpState: boolean) => {
    SetCanAttackFriendly(PlayerPedId(), pvpState, false);
    NetworkSetFriendlyFireOption(pvpState);
  });

  // ---------- Teleport commands ----------

  onNet(
    'QBCore:Command:TeleportToPlayer',
    (coords: { x: number; y: number; z: number }) => {
      const ped = PlayerPedId();
      SetPedCoordsKeepVehicle(ped, coords.x, coords.y, coords.z);
    }
  );

  onNet(
    'QBCore:Command:TeleportToCoords',
    (x: number, y: number, z: number, h?: number) => {
      const ped = PlayerPedId();
      SetPedCoordsKeepVehicle(ped, x, y, z);
      SetEntityHeading(ped, h ?? GetEntityHeading(ped));
    }
  );

  onNet('QBCore:Command:GoToMarker', async () => {
    const blipMarker = GetFirstBlipInfoId(8);
    if (!DoesBlipExist(blipMarker)) {
      Functions.Notify('No waypoint set', 'error', 5000);
      return;
    }
    DoScreenFadeOut(650);
    while (!IsScreenFadedOut()) await sleep(0);
    const ped = PlayerPedId();
    const coords = GetBlipInfoIdCoord(blipMarker) as unknown as [number, number, number];
    const vehicle = GetVehiclePedIsIn(ped, false);
    const oldCoords = GetEntityCoords(ped) as unknown as [number, number, number];
    const x = coords[0];
    const y = coords[1];
    let groundZ = 850.0;
    const Z_START = 950.0;
    let found = false;

    if (vehicle > 0) FreezeEntityPosition(vehicle, true);
    else FreezeEntityPosition(ped, true);

    for (let i = Z_START; i >= 0; i -= 25.0) {
      const z = i % 2 !== 0 ? Z_START - i : i;
      NewLoadSceneStart(x, y, z, x, y, z, 50.0, 0);
      const start = GetGameTimer();
      while (IsNetworkLoadingScene()) {
        if (GetGameTimer() - start > 1000) break;
        await sleep(0);
      }
      NewLoadSceneStop();
      SetPedCoordsKeepVehicle(ped, x, y, z);
      while (!HasCollisionLoadedAroundEntity(ped)) {
        RequestCollisionAtCoord(x, y, z);
        if (GetGameTimer() - start > 1000) break;
        await sleep(0);
      }
      const result = GetGroundZFor_3dCoord(x, y, z, false) as unknown as [
        boolean,
        number,
      ];
      found = result[0];
      groundZ = result[1];
      if (found) {
        await sleep(0);
        SetPedCoordsKeepVehicle(ped, x, y, groundZ);
        break;
      }
      await sleep(0);
    }

    DoScreenFadeIn(650);
    if (vehicle > 0) FreezeEntityPosition(vehicle, false);
    else FreezeEntityPosition(ped, false);

    if (!found) {
      SetPedCoordsKeepVehicle(ped, oldCoords[0], oldCoords[1], oldCoords[2] - 1.0);
      Functions.Notify("Couldn't teleport to that location", 'error', 5000);
      return;
    }
    SetPedCoordsKeepVehicle(ped, x, y, groundZ);
    Functions.Notify('Teleported to waypoint', 'success', 5000);
  });

  // ---------- Vehicle commands (admin /car, /dv) ----------

  onNet('QBCore:Command:SpawnVehicle', async (vehName: string) => {
    const ped = PlayerPedId();
    const hash = GetHashKey(vehName);
    const veh = GetVehiclePedIsUsing(ped);
    if (!IsModelInCdimage(hash)) return;
    RequestModel(hash);
    while (!HasModelLoaded(hash)) await sleep(0);
    if (IsPedInAnyVehicle(ped, false)) {
      SetEntityAsMissionEntity(veh, true, true);
      DeleteVehicle(veh);
    }
    const coords = GetEntityCoords(ped) as unknown as [number, number, number];
    const vehicle = CreateVehicle(
      hash,
      coords[0],
      coords[1],
      coords[2],
      GetEntityHeading(ped),
      true,
      false
    );
    TaskWarpPedIntoVehicle(ped, vehicle, -1);
    SetVehicleFuelLevel(vehicle, 100.0);
    SetVehicleDirtLevel(vehicle, 0.0);
    SetModelAsNoLongerNeeded(hash);
    emit('vehiclekeys:client:SetOwner', Functions.GetPlate(vehicle));
  });

  onNet('QBCore:Command:DeleteVehicle', () => {
    const ped = PlayerPedId();
    const veh = GetVehiclePedIsUsing(ped);
    if (veh !== 0) {
      SetEntityAsMissionEntity(veh, true, true);
      DeleteVehicle(veh);
      return;
    }
    const pcoords = GetEntityCoords(ped) as unknown as [number, number, number];
    for (const v of GetGamePool('CVehicle') as number[]) {
      const vc = GetEntityCoords(v) as unknown as [number, number, number];
      const dx = pcoords[0] - vc[0];
      const dy = pcoords[1] - vc[1];
      const dz = pcoords[2] - vc[2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= 5.0) {
        SetEntityAsMissionEntity(v, true, true);
        DeleteVehicle(v);
      }
    }
  });

  onNet(
    'QBCore:Client:VehicleInfo',
    (info: { vehicle: number; seat: number; modelName: string; event: string }) => {
      const plate = Functions.GetPlate(info.vehicle) as string | undefined;
      let hasKeys = true;
      if (GetResourceState('qb-vehiclekeys') === 'started') {
        try {
          hasKeys = (exports as any)['qb-vehiclekeys'].HasKeys(plate);
        } catch {
          hasKeys = false;
        }
      }
      const data = {
        vehicle: info.vehicle,
        seat: info.seat,
        name: info.modelName,
        plate,
        driver: GetPedInVehicleSeat(info.vehicle, -1),
        inseat: GetPedInVehicleSeat(info.vehicle, info.seat),
        haskeys: hasKeys,
      };
      emit(`QBCore:Client:${info.event}Vehicle`, data);
    }
  );

  // ---------- PlayerData propagation ----------

  onNet('QBCore:Player:SetPlayerData', (val: Record<string, unknown>) => {
    QBCore.PlayerData = val;
  });

  onNet(
    'QBCore:Player:UpdatePlayerDataField',
    (key: string, val: unknown) => {
      if (QBCore.PlayerData && key) {
        (QBCore.PlayerData as Record<string, unknown>)[key] = val;
      }
    }
  );

  onNet('QBCore:Player:UpdatePlayerData', () => {
    emitNet('QBCore:UpdatePlayer');
  });

  onNet(
    'QBCore:Notify',
    (text: string, type?: string, length?: number, icon?: string) => {
      Functions.Notify(text, type, length, icon);
    }
  );

  RegisterNuiCallback('getNotifyConfig', (_data: unknown, cb: (cfg: unknown) => void) => {
    cb(QBCore.Config.Notify);
  });

  // ---------- Callback bridges ----------

  onNet(
    'QBCore:Client:TriggerClientCallback',
    (name: string, ...args: unknown[]) => {
      const cb = QBCore.ClientCallbacks[name];
      if (!cb) return;
      cb(
        (...vals: unknown[]) => {
          emitNet('QBCore:Server:TriggerClientCallback', name, ...vals);
        },
        ...args
      );
    }
  );

  onNet('QBCore:Client:TriggerCallback', (name: string, ...args: unknown[]) => {
    const cb = QBCore.ServerCallbacks[name];
    if (!cb) return;
    cb.promise?.resolve(args.length === 1 ? args[0] : args);
    cb.callback?.(...args);
    delete QBCore.ServerCallbacks[name];
  });

  // ---------- Shared sync from server ----------

  onNet(
    'QBCore:Client:OnSharedUpdate',
    (tableName: string, key: string, value: unknown) => {
      const t = (QBCore.Shared as Record<string, Record<string, unknown>>)[
        tableName
      ];
      if (!t) return;
      if (value === null || value === undefined) {
        delete t[key];
      } else {
        t[key] = value as Record<string, unknown>;
      }
      emit('QBCore:Client:UpdateObject');
    }
  );

  onNet(
    'QBCore:Client:OnSharedUpdateMultiple',
    (tableName: string, values: Record<string, unknown>) => {
      const t = (QBCore.Shared as Record<string, Record<string, unknown>>)[
        tableName
      ];
      if (!t) return;
      for (const [k, v] of Object.entries(values)) {
        t[k] = v as Record<string, unknown>;
      }
      emit('QBCore:Client:UpdateObject');
    }
  );

  onNet('QBCore:Client:SharedUpdate', (table: Record<string, unknown>) => {
    QBCore.Shared = table as typeof QBCore.Shared;
  });

  // ---------- /me 3D text ----------

  function draw3dText(coords: [number, number, number], str: string): void {
    const result = World3dToScreen2d(coords[0], coords[1], coords[2]) as unknown as [
      boolean,
      number,
      number,
    ];
    const [onScreen, worldX, worldY] = result;
    if (!onScreen) return;
    const camCoords = GetGameplayCamCoord() as unknown as [number, number, number];
    const dx = camCoords[0] - coords[0];
    const dy = camCoords[1] - coords[1];
    const dz = camCoords[2] - coords[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const scale = 200 / (GetGameplayCamFov() * distance);
    SetTextScale(1.0, 0.5 * scale);
    SetTextFont(4);
    SetTextColour(255, 255, 255, 255);
    SetTextEdge(2, 0, 0, 0, 150);
    SetTextProportional(true);
    SetTextOutline();
    SetTextCentre(true);
    BeginTextCommandDisplayText('STRING');
    AddTextComponentSubstringPlayerName(str);
    EndTextCommandDisplayText(worldX, worldY);
  }

  onNet('QBCore:Command:ShowMe3D', (senderId: number, msg: string) => {
    const sender = GetPlayerFromServerId(senderId);
    void (async () => {
      const displayUntil = GetGameTimer() + 5000;
      while (GetGameTimer() < displayUntil) {
        const targetPed = GetPlayerPed(String(sender));
        const tCoords = GetEntityCoords(targetPed) as unknown as [
          number,
          number,
          number,
        ];
        draw3dText(tCoords, msg);
        await sleep(0);
      }
    })();
  });
}
