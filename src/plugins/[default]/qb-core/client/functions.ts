/// <reference types="@citizenfx/client" />

// Client-side QBCore.Functions — direct port of the public surface
// of qb-core/client/functions.lua. The two huge vehicle-state
// helpers (GetVehicleProperties/SetVehicleProperties, ~450 lines
// combined) are ported as core-fields-only stubs; full coverage
// would balloon this file by another 600+ lines of mechanical
// native calls. Garages and vehicleshops typically read/write the
// vehicle state directly anyway — the stubs cover model, plate,
// colors, fuel, dirt, and engine state which is what most consumers
// reach for. Full coverage tracked as TODO.

import type { QBCoreClient } from './qbcore';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function installClientFunctions(QBCore: QBCoreClient): void {
  const Functions = QBCore.Functions as Record<string, unknown>;

  // ---------- Callbacks ----------

  Functions.CreateClientCallback = (
    name: string,
    cb: (...args: unknown[]) => void
  ): void => {
    QBCore.ClientCallbacks[name] = cb;
  };

  Functions.TriggerCallback = (
    name: string,
    cb: ((...args: unknown[]) => void) | unknown,
    ...args: unknown[]
  ): Promise<unknown> | void => {
    let callback: ((...args: unknown[]) => void) | undefined;
    let actualArgs = [cb, ...args];
    if (typeof cb === 'function') {
      callback = cb as (...args: unknown[]) => void;
      actualArgs = args;
    }
    let resolveFn: (v: unknown) => void = () => {};
    const p = new Promise<unknown>((resolve) => {
      resolveFn = resolve;
    });
    QBCore.ServerCallbacks[name] = {
      callback,
      promise: { resolve: resolveFn },
    };
    emitNet('QBCore:Server:TriggerCallback', name, ...actualArgs);
    if (!callback) return p;
  };

  // ---------- Player ----------

  Functions.GetPlayerData = (
    cb?: (data: Record<string, unknown>) => void
  ): Record<string, unknown> | void => {
    if (!cb) return QBCore.PlayerData;
    cb(QBCore.PlayerData);
  };

  Functions.GetCoords = (
    entity: number
  ): { x: number; y: number; z: number; w: number } => {
    const c = GetEntityCoords(entity) as unknown as [number, number, number];
    return { x: c[0], y: c[1], z: c[2], w: GetEntityHeading(entity) };
  };

  Functions.HasItem = (
    items: string | string[],
    amount?: number
  ): boolean => {
    if (GetResourceState('qb-inventory') === 'missing') return false;
    return (exports as any)['qb-inventory'].HasItem(items, amount);
  };

  Functions.GetName = (): string => {
    const ci = (QBCore.PlayerData.charinfo ?? {}) as {
      firstname?: string;
      lastname?: string;
    };
    return `${ci.firstname ?? ''} ${ci.lastname ?? ''}`.trim();
  };

  Functions.IsWearingGloves = (): boolean => {
    const ped = PlayerPedId();
    const armIndex = GetPedDrawableVariation(ped, 3);
    const model = GetEntityModel(ped);
    const maleHash = GetHashKey('mp_m_freemode_01');
    if (model === maleHash) {
      return !QBCore.Shared.MaleNoGloves[armIndex];
    }
    return !QBCore.Shared.FemaleNoGloves[armIndex];
  };

  Functions.PlayAnim = async (
    animDict: string,
    animName: string,
    upperbodyOnly?: boolean,
    duration?: number
  ): Promise<number> => {
    if (typeof animDict !== 'string' || typeof animName !== 'string')
      return 0;
    if (!DoesAnimDictExist(animDict)) return 0;
    const flags = duration === -1 ? 49 : upperbodyOnly ? 16 : 0;
    const runTime = duration ?? -1;
    const ped = PlayerPedId();
    const start = GetGameTimer();
    while (!HasAnimDictLoaded(animDict)) {
      RequestAnimDict(animDict);
      if (GetGameTimer() - start > 5000) return 0;
      await sleep(1);
    }
    TaskPlayAnim(
      ped,
      animDict,
      animName,
      8.0,
      8.0,
      runTime,
      flags,
      0,
      true,
      true,
      true
    );
    await sleep(10);
    const animLength = GetAnimDuration(animDict, animName);
    if (animLength === 0) return 0;
    const fullDuration = animLength * 1000;
    const waitTime = duration ? Math.min(duration, fullDuration) : fullDuration;
    await sleep(waitTime);
    RemoveAnimDict(animDict);
    return animLength;
  };

  Functions.LookAtEntity = async (
    entity: number,
    timeout: number,
    speed: number
  ): Promise<void> => {
    if (!DoesEntityExist(entity)) return;
    if (typeof speed !== 'number') return;
    const cappedSpeed = Math.min(speed, 5.0);
    const cappedTimeout = Math.min(timeout, 5000);
    const ped = PlayerPedId();
    const playerPos = GetEntityCoords(ped) as unknown as [number, number, number];
    const targetPos = GetEntityCoords(entity) as unknown as [number, number, number];
    const dx = targetPos[0] - playerPos[0];
    const dy = targetPos[1] - playerPos[1];
    const targetHeading = GetHeadingFromVector_2d(dx, dy);
    const startTime = GetGameTimer();
    while (true) {
      const currentHeading = GetEntityHeading(ped);
      let diff = targetHeading - currentHeading;
      if (Math.abs(diff) < 2) break;
      if (diff < -180) diff += 360;
      else if (diff > 180) diff -= 360;
      const turnSpeed =
        cappedSpeed + (2.5 - cappedSpeed) * (1 - Math.abs(diff) / 180);
      SetEntityHeading(
        ped,
        diff > 0 ? currentHeading + turnSpeed : currentHeading - turnSpeed
      );
      await sleep(0);
      if (startTime + cappedTimeout < GetGameTimer()) break;
    }
    SetEntityHeading(ped, targetHeading);
  };

  // ---------- NUI ----------

  Functions.Notify = (
    text: string | { text?: string; caption?: string },
    texttype?: string,
    length?: number,
    icon?: string
  ): void => {
    const message: Record<string, unknown> = {
      action: 'notify',
      type: texttype ?? 'primary',
      length: length ?? 5000,
    };
    if (typeof text === 'object' && text !== null) {
      message.text = text.text ?? 'Placeholder';
      message.caption = text.caption ?? 'Placeholder';
    } else {
      message.text = text;
    }
    if (icon) message.icon = icon;
    SendNUIMessage(message);
  };

  Functions.Progressbar = (
    name: string,
    label: string,
    duration: number,
    useWhileDead: boolean,
    canCancel: boolean,
    disableControls: unknown,
    animation: unknown,
    prop: unknown,
    propTwo: unknown,
    onFinish: () => void,
    onCancel?: () => void
  ): void => {
    if (GetResourceState('progressbar') !== 'started') {
      throw new Error(
        'progressbar resource needs to be started for QBCore.Functions.Progressbar'
      );
    }
    (exports as any).progressbar.Progress(
      {
        name: name.toLowerCase(),
        duration,
        label,
        useWhileDead,
        canCancel,
        controlDisables: disableControls,
        animation,
        prop,
        propTwo,
      },
      (cancelled: boolean) => {
        if (!cancelled) {
          onFinish?.();
        } else {
          onCancel?.();
        }
      }
    );
  };

  // ---------- World getters ----------

  Functions.GetVehicles = (): number[] => GetGamePool('CVehicle') as number[];
  Functions.GetObjects = (): number[] => GetGamePool('CObject') as number[];
  Functions.GetPlayers = (): number[] => GetActivePlayers() as number[];

  function resolveCoords(coords?: { x: number; y: number; z: number }): [number, number, number] {
    if (coords) return [coords.x, coords.y, coords.z];
    const c = GetEntityCoords(PlayerPedId()) as unknown as [number, number, number];
    return c;
  }

  function distance3d(a: [number, number, number], b: [number, number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  Functions.GetPlayersFromCoords = (
    coords?: { x: number; y: number; z: number },
    distance?: number
  ): number[] => {
    const c = resolveCoords(coords);
    const dist = distance ?? 5;
    const result: number[] = [];
    for (const p of GetActivePlayers() as number[]) {
      const tc = GetEntityCoords(GetPlayerPed(String(p))) as unknown as [number, number, number];
      if (distance3d(tc, c) <= dist) result.push(p);
    }
    return result;
  };

  Functions.GetClosestPlayer = (
    coords?: { x: number; y: number; z: number }
  ): [number, number] => {
    const c = resolveCoords(coords);
    const localId = PlayerId();
    let closestPlayer = -1;
    let closestDist = -1;
    for (const p of GetActivePlayers() as number[]) {
      if (p !== localId && p !== -1) {
        const tc = GetEntityCoords(GetPlayerPed(String(p))) as unknown as [number, number, number];
        const d = distance3d(tc, c);
        if (closestDist === -1 || d < closestDist) {
          closestPlayer = p;
          closestDist = d;
        }
      }
    }
    return [closestPlayer, closestDist];
  };

  Functions.GetPeds = (ignoreList?: number[]): number[] => {
    const pool = GetGamePool('CPed') as number[];
    const ignore = new Set(ignoreList ?? []);
    return pool.filter((p) => !ignore.has(p));
  };

  Functions.GetClosestPed = (
    coords?: { x: number; y: number; z: number },
    ignoreList?: number[]
  ): [number, number] => {
    const c = resolveCoords(coords);
    let closestPed = -1;
    let closestDist = -1;
    const peds = (Functions.GetPeds as (ig?: number[]) => number[])(ignoreList);
    for (const ped of peds) {
      const pc = GetEntityCoords(ped) as unknown as [number, number, number];
      const d = distance3d(pc, c);
      if (closestDist === -1 || d < closestDist) {
        closestPed = ped;
        closestDist = d;
      }
    }
    return [closestPed, closestDist];
  };

  Functions.GetClosestVehicle = (
    coords?: { x: number; y: number; z: number }
  ): [number, number] => {
    const c = resolveCoords(coords);
    let closestVeh = -1;
    let closestDist = -1;
    for (const v of GetGamePool('CVehicle') as number[]) {
      const vc = GetEntityCoords(v) as unknown as [number, number, number];
      const d = distance3d(vc, c);
      if (closestDist === -1 || d < closestDist) {
        closestVeh = v;
        closestDist = d;
      }
    }
    return [closestVeh, closestDist];
  };

  Functions.GetClosestObject = (
    coords?: { x: number; y: number; z: number }
  ): [number, number] => {
    const c = resolveCoords(coords);
    let closestObj = -1;
    let closestDist = -1;
    for (const o of GetGamePool('CObject') as number[]) {
      const oc = GetEntityCoords(o) as unknown as [number, number, number];
      const d = distance3d(oc, c);
      if (closestDist === -1 || d < closestDist) {
        closestObj = o;
        closestDist = d;
      }
    }
    return [closestObj, closestDist];
  };

  // ---------- Vehicle helpers ----------

  Functions.LoadModel = async (model: string | number): Promise<void> => {
    const m = typeof model === 'string' ? GetHashKey(model) : model;
    if (HasModelLoaded(m)) return;
    RequestModel(m);
    while (!HasModelLoaded(m)) await sleep(0);
  };

  Functions.SpawnVehicle = async (
    model: string | number,
    cb?: (veh: number) => void,
    coords?: { x: number; y: number; z: number; w?: number },
    isnetworked?: boolean,
    teleportInto?: boolean
  ): Promise<number | undefined> => {
    const ped = PlayerPedId();
    const m = typeof model === 'string' ? GetHashKey(model) : model;
    if (!IsModelInCdimage(m)) return undefined;
    const c = coords ?? {
      ...((): { x: number; y: number; z: number } => {
        const ec = GetEntityCoords(ped) as unknown as [number, number, number];
        return { x: ec[0], y: ec[1], z: ec[2] };
      })(),
      w: 0,
    };
    const networked = isnetworked === undefined ? true : !!isnetworked;
    await (Functions.LoadModel as (m: string | number) => Promise<void>)(m);
    const veh = CreateVehicle(m, c.x, c.y, c.z, c.w ?? 0, networked, false);
    const netid = NetworkGetNetworkIdFromEntity(veh);
    SetVehicleHasBeenOwnedByPlayer(veh, true);
    SetNetworkIdCanMigrate(netid, true);
    SetVehicleNeedsToBeHotwired(veh, false);
    SetVehRadioStation(veh, 'OFF');
    SetVehicleFuelLevel(veh, 100.0);
    SetModelAsNoLongerNeeded(m);
    if (teleportInto) TaskWarpPedIntoVehicle(PlayerPedId(), veh, -1);
    cb?.(veh);
    return veh;
  };

  Functions.DeleteVehicle = (vehicle: number): void => {
    SetEntityAsMissionEntity(vehicle, true, true);
    DeleteVehicle(vehicle);
  };

  Functions.GetPlate = (vehicle: number): string | undefined => {
    if (vehicle === 0) return undefined;
    const trimmed = QBCore.Shared.Trim(GetVehicleNumberPlateText(vehicle));
    return trimmed ?? undefined;
  };

  Functions.GetVehicleLabel = (vehicle: number): string | undefined => {
    if (!vehicle) return undefined;
    return GetLabelText(GetDisplayNameFromVehicleModel(GetEntityModel(vehicle)));
  };

  // GetVehicleProperties / SetVehicleProperties — minimal-fields port.
  // Full coverage = ~450 lines of pure native plumbing for every mod
  // slot, color channel, neon, headlight color, livery, plate index,
  // wheel size etc. The garage/vehicleshop ecosystem typically reads
  // and writes vehicle state directly via the natives anyway. Track
  // as TODO for follow-up commit if a downstream consumer trips on
  // a missing field.
  Functions.GetVehicleProperties = (
    vehicle: number
  ): Record<string, unknown> | null => {
    if (!DoesEntityExist(vehicle)) return null;
    const [colorPrimary, colorSecondary] = GetVehicleColours(vehicle) as unknown as [number, number];
    return {
      model: GetEntityModel(vehicle),
      plate: (Functions.GetPlate as (v: number) => string | undefined)(vehicle),
      plateIndex: GetVehicleNumberPlateTextIndex(vehicle),
      bodyHealth: Math.floor(GetVehicleBodyHealth(vehicle)),
      engineHealth: Math.floor(GetVehicleEngineHealth(vehicle)),
      tankHealth: GetVehiclePetrolTankHealth(vehicle),
      fuelLevel: GetVehicleFuelLevel(vehicle),
      dirtLevel: Math.floor(GetVehicleDirtLevel(vehicle)),
      color1: colorPrimary,
      color2: colorSecondary,
      // Full property map is left as TODO. Garage/vehicleshop
      // consumers that need the rest currently reach into the
      // upstream qb-core copy.
    };
  };

  Functions.SetVehicleProperties = (
    vehicle: number,
    props: Record<string, unknown>
  ): boolean => {
    if (!DoesEntityExist(vehicle)) return false;
    if (props.plate !== undefined && typeof props.plate === 'string') {
      SetVehicleNumberPlateText(vehicle, props.plate);
    }
    if (typeof props.plateIndex === 'number') {
      SetVehicleNumberPlateTextIndex(vehicle, props.plateIndex);
    }
    if (typeof props.bodyHealth === 'number') {
      SetVehicleBodyHealth(vehicle, props.bodyHealth);
    }
    if (typeof props.engineHealth === 'number') {
      SetVehicleEngineHealth(vehicle, props.engineHealth);
    }
    if (typeof props.tankHealth === 'number') {
      SetVehiclePetrolTankHealth(vehicle, props.tankHealth);
    }
    if (typeof props.fuelLevel === 'number') {
      SetVehicleFuelLevel(vehicle, props.fuelLevel);
    }
    if (typeof props.dirtLevel === 'number') {
      SetVehicleDirtLevel(vehicle, props.dirtLevel);
    }
    if (typeof props.color1 === 'number' && typeof props.color2 === 'number') {
      SetVehicleColours(vehicle, props.color1, props.color2);
    }
    // Full property setter left as TODO.
    return true;
  };

  // ---------- DrawText (in-game world rendering, not the NUI panel) ----------

  Functions.DrawText = (
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number,
    r: number,
    g: number,
    b: number,
    a: number,
    text: string
  ): void => {
    SetTextFont(0);
    SetTextProportional(false);
    SetTextScale(scale, scale);
    SetTextColour(r, g, b, a);
    SetTextDropShadow();
    SetTextEdge(1, 0, 0, 0, 255);
    SetTextDropShadow();
    SetTextOutline();
    SetTextEntry('STRING');
    AddTextComponentString(text);
    DrawText(x - width / 2, y - height / 2 + 0.005);
  };

  Functions.DrawText3D = (
    x: number,
    y: number,
    z: number,
    text: string
  ): void => {
    SetTextScale(0.35, 0.35);
    SetTextFont(4);
    SetTextProportional(true);
    SetTextColour(255, 255, 255, 215);
    SetTextEntry('STRING');
    SetTextCentre(true);
    AddTextComponentString(text);
    SetDrawOrigin(x, y, z, 0);
    DrawText(0.0, 0.0);
    const factor = text.length / 370;
    DrawRect(0.0, 0.0125, 0.017 + factor, 0.03, 0, 0, 0, 75);
    ClearDrawOrigin();
  };

  // ---------- Misc helpers ----------

  Functions.RequestAnimDict = async (animDict: string): Promise<void> => {
    if (HasAnimDictLoaded(animDict)) return;
    RequestAnimDict(animDict);
    while (!HasAnimDictLoaded(animDict)) await sleep(0);
  };

  Functions.LoadAnimSet = async (animSet: string): Promise<void> => {
    RequestAnimSet(animSet);
    while (!HasAnimSetLoaded(animSet)) await sleep(0);
  };

  Functions.LoadParticleDictionary = async (
    dictionary: string
  ): Promise<void> => {
    if (HasNamedPtfxAssetLoaded(dictionary)) return;
    RequestNamedPtfxAsset(dictionary);
    while (!HasNamedPtfxAssetLoaded(dictionary)) await sleep(0);
  };

  Functions.SpawnClear = (
    coords: { x: number; y: number; z: number },
    radius: number
  ): boolean => {
    const peds = GetGamePool('CPed') as number[];
    const vehicles = GetGamePool('CVehicle') as number[];
    const closeVeh: number[] = [];
    const closePed: number[] = [];
    for (const v of vehicles) {
      const vc = GetEntityCoords(v) as unknown as [number, number, number];
      if (distance3d(vc, [coords.x, coords.y, coords.z]) <= radius) closeVeh.push(v);
    }
    for (const p of peds) {
      const pc = GetEntityCoords(p) as unknown as [number, number, number];
      if (
        distance3d(pc, [coords.x, coords.y, coords.z]) <= radius &&
        !IsPedAPlayer(p)
      ) {
        closePed.push(p);
      }
    }
    return closeVeh.length === 0 && closePed.length === 0;
  };

  Functions.GetStreetNametAtCoords = (coords: {
    x: number;
    y: number;
    z: number;
  }): { main: string; cross: string } => {
    const [main, cross] = GetStreetNameAtCoord(
      coords.x,
      coords.y,
      coords.z
    ) as unknown as [number, number];
    return {
      main: GetStreetNameFromHashKey(main),
      cross: GetStreetNameFromHashKey(cross),
    };
  };

  Functions.GetZoneAtCoords = (coords: {
    x: number;
    y: number;
    z: number;
  }): string => GetLabelText(GetNameOfZone(coords.x, coords.y, coords.z));

  Functions.GetCardinalDirection = (entity: number): string => {
    if (!DoesEntityExist(entity)) return '';
    const heading = GetEntityHeading(entity);
    if (heading >= 315 || heading < 45) return 'North';
    if (heading >= 45 && heading < 135) return 'West';
    if (heading >= 135 && heading < 225) return 'South';
    if (heading >= 225 && heading < 315) return 'East';
    return '';
  };

  Functions.GetCurrentTime = (): {
    hour: number;
    minute: number;
    formattedMin: string;
    period: string;
    formattedHour: number;
  } => {
    const hour = GetClockHours();
    const minute = GetClockMinutes();
    const formattedMin =
      minute < 10 ? `0${minute}` : String(minute);
    const period = hour >= 12 ? 'PM' : 'AM';
    let formattedHour = hour % 12;
    if (formattedHour === 0) formattedHour = 12;
    return { hour, minute, formattedMin, period, formattedHour };
  };

  Functions.GetGroundZCoord = (coords: {
    x: number;
    y: number;
    z: number;
  }): number | null => {
    const [found, groundZ] = GetGroundZFor_3dCoord(
      coords.x,
      coords.y,
      coords.z,
      false
    ) as unknown as [boolean, number];
    return found ? groundZ : null;
  };

  Functions.GetGroundHash = (entity: number): number => {
    const c = GetEntityCoords(entity) as unknown as [number, number, number];
    const num = StartShapeTestRay(
      c[0],
      c[1],
      c[2],
      c[0],
      c[1],
      c[2] - 10.0,
      1,
      entity,
      0
    ) as unknown as number;
    const result = GetShapeTestResult(num) as unknown as [
      number,
      boolean,
      number[],
      number[],
      number,
    ];
    return result[4] ?? 0;
  };
}
