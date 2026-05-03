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
import { Round } from '../shared/main';

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

  // Full direct port of upstream's GetVehicleProperties /
  // SetVehicleProperties. Covers: model, plate (text + index), all
  // healths (body/engine/tank/fuel/dirt/oil), primary+secondary
  // colors (custom RGB tuple OR palette index), pearlescent +
  // dashboard + wheel + interior colors, wheel type/size/width, all
  // 4 tire health/burst states (state + complete), 8 window
  // intactness states, 6 door damage states, neon (4 channels +
  // RGB color), tyre smoke RGB, xenon (palette OR custom RGB
  // tuple), 12 vehicle extras, all ~50 mod slots, livery (modLivery
  // with SetVehicleLivery sync), liveryRoof, modKit ID, custom tire
  // variations (front/back), modTurbo/modSmokeEnabled/modXenon
  // (toggle mods).

  type VehicleProps = Record<string, unknown>;

  Functions.GetVehicleProperties = (
    vehicle: number
  ): VehicleProps | null => {
    if (!DoesEntityExist(vehicle)) return null;

    const [pearlescentColor, wheelColor] = GetVehicleExtraColours(
      vehicle
    ) as unknown as [number, number];

    let colorPrimary: number | [number, number, number];
    let colorSecondary: number | [number, number, number];
    const [cp, cs] = GetVehicleColours(vehicle) as unknown as [number, number];
    colorPrimary = cp;
    colorSecondary = cs;
    if (GetIsVehiclePrimaryColourCustom(vehicle)) {
      const [r, g, b] = GetVehicleCustomPrimaryColour(vehicle) as unknown as [
        number,
        number,
        number,
      ];
      colorPrimary = [r, g, b];
    }
    if (GetIsVehicleSecondaryColourCustom(vehicle)) {
      const [r, g, b] = GetVehicleCustomSecondaryColour(vehicle) as unknown as [
        number,
        number,
        number,
      ];
      colorSecondary = [r, g, b];
    }

    const extras: Record<string, boolean> = {};
    for (let extraId = 0; extraId <= 12; extraId++) {
      if (DoesExtraExist(vehicle, extraId)) {
        // FXServer's IsVehicleExtraTurnedOn natively returns 1/0 even
        // though @citizenfx types declare boolean — match upstream's
        // explicit `== 1` compare via numeric cast.
        extras[String(extraId)] =
          (IsVehicleExtraTurnedOn(vehicle, extraId) as unknown as number) === 1;
      }
    }

    let modLivery = GetVehicleMod(vehicle, 48);
    if (
      GetVehicleMod(vehicle, 48) === -1 &&
      GetVehicleLivery(vehicle) !== 0
    ) {
      modLivery = GetVehicleLivery(vehicle);
    }

    const tireHealth: Record<number, number> = {};
    for (let i = 0; i <= 3; i++) {
      tireHealth[i] = GetVehicleWheelHealth(vehicle, i);
    }
    const tireBurstState: Record<number, boolean> = {};
    for (let i = 0; i <= 5; i++) {
      tireBurstState[i] = IsVehicleTyreBurst(vehicle, i, false);
    }
    const tireBurstCompletely: Record<number, boolean> = {};
    for (let i = 0; i <= 5; i++) {
      tireBurstCompletely[i] = IsVehicleTyreBurst(vehicle, i, true);
    }
    const windowStatus: Record<number, boolean> = {};
    for (let i = 0; i <= 7; i++) {
      windowStatus[i] =
        (IsVehicleWindowIntact(vehicle, i) as unknown as number) === 1;
    }
    const doorStatus: Record<number, boolean> = {};
    for (let i = 0; i <= 5; i++) {
      doorStatus[i] =
        (IsVehicleDoorDamaged(vehicle, i) as unknown as number) === 1;
    }

    let xenonColor: number | [number, number, number];
    const xenonResult = GetVehicleXenonLightsCustomColor(
      vehicle
    ) as unknown as [boolean, number, number, number];
    if (xenonResult[0]) {
      xenonColor = [xenonResult[1], xenonResult[2], xenonResult[3]];
    } else {
      xenonColor = GetVehicleXenonLightsColor(vehicle) as unknown as number;
    }

    const neonColorRaw = GetVehicleNeonLightsColour(vehicle) as unknown as [
      number,
      number,
      number,
    ];
    const tyreSmokeRaw = GetVehicleTyreSmokeColor(vehicle) as unknown as [
      number,
      number,
      number,
    ];

    return {
      model: GetEntityModel(vehicle),
      plate: (Functions.GetPlate as (v: number) => string | undefined)(vehicle),
      plateIndex: GetVehicleNumberPlateTextIndex(vehicle),
      bodyHealth: Round(GetVehicleBodyHealth(vehicle), 1),
      engineHealth: Round(GetVehicleEngineHealth(vehicle), 1),
      tankHealth: Round(GetVehiclePetrolTankHealth(vehicle), 1),
      fuelLevel: Round(GetVehicleFuelLevel(vehicle), 1),
      dirtLevel: Round(GetVehicleDirtLevel(vehicle), 1),
      oilLevel: Round(GetVehicleOilLevel(vehicle), 1),
      color1: colorPrimary,
      color2: colorSecondary,
      pearlescentColor,
      dashboardColor: GetVehicleDashboardColour(vehicle),
      wheelColor,
      wheels: GetVehicleWheelType(vehicle),
      wheelSize: GetVehicleWheelSize(vehicle),
      wheelWidth: GetVehicleWheelWidth(vehicle),
      tireHealth,
      tireBurstState,
      tireBurstCompletely,
      windowTint: GetVehicleWindowTint(vehicle),
      windowStatus,
      doorStatus,
      neonEnabled: [
        IsVehicleNeonLightEnabled(vehicle, 0),
        IsVehicleNeonLightEnabled(vehicle, 1),
        IsVehicleNeonLightEnabled(vehicle, 2),
        IsVehicleNeonLightEnabled(vehicle, 3),
      ],
      neonColor: neonColorRaw,
      interiorColor: GetVehicleInteriorColour(vehicle),
      extras,
      tyreSmokeColor: tyreSmokeRaw,
      xenonColor,
      modSpoilers: GetVehicleMod(vehicle, 0),
      modFrontBumper: GetVehicleMod(vehicle, 1),
      modRearBumper: GetVehicleMod(vehicle, 2),
      modSideSkirt: GetVehicleMod(vehicle, 3),
      modExhaust: GetVehicleMod(vehicle, 4),
      modFrame: GetVehicleMod(vehicle, 5),
      modGrille: GetVehicleMod(vehicle, 6),
      modHood: GetVehicleMod(vehicle, 7),
      modFender: GetVehicleMod(vehicle, 8),
      modRightFender: GetVehicleMod(vehicle, 9),
      modRoof: GetVehicleMod(vehicle, 10),
      modEngine: GetVehicleMod(vehicle, 11),
      modBrakes: GetVehicleMod(vehicle, 12),
      modTransmission: GetVehicleMod(vehicle, 13),
      modHorns: GetVehicleMod(vehicle, 14),
      modSuspension: GetVehicleMod(vehicle, 15),
      modArmor: GetVehicleMod(vehicle, 16),
      modKit17: GetVehicleMod(vehicle, 17),
      modTurbo: IsToggleModOn(vehicle, 18),
      modKit19: GetVehicleMod(vehicle, 19),
      modSmokeEnabled: IsToggleModOn(vehicle, 20),
      modKit21: GetVehicleMod(vehicle, 21),
      modXenon: IsToggleModOn(vehicle, 22),
      modFrontWheels: GetVehicleMod(vehicle, 23),
      modBackWheels: GetVehicleMod(vehicle, 24),
      modCustomTiresF: GetVehicleModVariation(vehicle, 23),
      modCustomTiresR: GetVehicleModVariation(vehicle, 24),
      modPlateHolder: GetVehicleMod(vehicle, 25),
      modVanityPlate: GetVehicleMod(vehicle, 26),
      modTrimA: GetVehicleMod(vehicle, 27),
      modOrnaments: GetVehicleMod(vehicle, 28),
      modDashboard: GetVehicleMod(vehicle, 29),
      modDial: GetVehicleMod(vehicle, 30),
      modDoorSpeaker: GetVehicleMod(vehicle, 31),
      modSeats: GetVehicleMod(vehicle, 32),
      modSteeringWheel: GetVehicleMod(vehicle, 33),
      modShifterLeavers: GetVehicleMod(vehicle, 34),
      modAPlate: GetVehicleMod(vehicle, 35),
      modSpeakers: GetVehicleMod(vehicle, 36),
      modTrunk: GetVehicleMod(vehicle, 37),
      modHydrolic: GetVehicleMod(vehicle, 38),
      modEngineBlock: GetVehicleMod(vehicle, 39),
      modAirFilter: GetVehicleMod(vehicle, 40),
      modStruts: GetVehicleMod(vehicle, 41),
      modArchCover: GetVehicleMod(vehicle, 42),
      modAerials: GetVehicleMod(vehicle, 43),
      modTrimB: GetVehicleMod(vehicle, 44),
      modTank: GetVehicleMod(vehicle, 45),
      modWindows: GetVehicleMod(vehicle, 46),
      modKit47: GetVehicleMod(vehicle, 47),
      modLivery,
      modKit49: GetVehicleMod(vehicle, 49),
      liveryRoof: GetVehicleRoofLivery(vehicle),
    };
  };

  Functions.SetVehicleProperties = (
    vehicle: number,
    props: VehicleProps
  ): boolean => {
    if (!DoesEntityExist(vehicle)) return false;

    if (props.extras && typeof props.extras === 'object') {
      for (const [id, enabled] of Object.entries(
        props.extras as Record<string, boolean>
      )) {
        // Note inverted boolean: SetVehicleExtra third arg is "disable",
        // so `enabled=true` → set 0 (visible), `enabled=false` → set 1.
        SetVehicleExtra(vehicle, Number(id), enabled ? false : true);
      }
    }

    const [colorPrimary, colorSecondary] = GetVehicleColours(
      vehicle
    ) as unknown as [number, number];
    const [pearlescentColor, wheelColor] = GetVehicleExtraColours(
      vehicle
    ) as unknown as [number, number];
    SetVehicleModKit(vehicle, 0);

    if (typeof props.plate === 'string') {
      SetVehicleNumberPlateText(vehicle, props.plate);
    }
    if (typeof props.plateIndex === 'number') {
      SetVehicleNumberPlateTextIndex(vehicle, props.plateIndex);
    }
    if (typeof props.bodyHealth === 'number') {
      SetVehicleBodyHealth(vehicle, props.bodyHealth + 0.0);
    }
    if (typeof props.engineHealth === 'number') {
      SetVehicleEngineHealth(vehicle, props.engineHealth + 0.0);
    }
    if (typeof props.tankHealth === 'number') {
      SetVehiclePetrolTankHealth(vehicle, props.tankHealth + 0.0);
    }
    if (typeof props.fuelLevel === 'number') {
      SetVehicleFuelLevel(vehicle, props.fuelLevel + 0.0);
    }
    if (typeof props.dirtLevel === 'number') {
      SetVehicleDirtLevel(vehicle, props.dirtLevel + 0.0);
    }
    if (typeof props.oilLevel === 'number') {
      SetVehicleOilLevel(vehicle, props.oilLevel + 0.0);
    }

    if (props.color1 !== undefined) {
      if (typeof props.color1 === 'number') {
        ClearVehicleCustomPrimaryColour(vehicle);
        SetVehicleColours(vehicle, props.color1, colorSecondary);
      } else if (Array.isArray(props.color1)) {
        SetVehicleCustomPrimaryColour(
          vehicle,
          props.color1[0] as number,
          props.color1[1] as number,
          props.color1[2] as number
        );
      }
    }
    if (props.color2 !== undefined) {
      if (typeof props.color2 === 'number') {
        ClearVehicleCustomSecondaryColour(vehicle);
        SetVehicleColours(
          vehicle,
          (props.color1 as number) ?? colorPrimary,
          props.color2
        );
      } else if (Array.isArray(props.color2)) {
        SetVehicleCustomSecondaryColour(
          vehicle,
          props.color2[0] as number,
          props.color2[1] as number,
          props.color2[2] as number
        );
      }
    }

    if (typeof props.pearlescentColor === 'number') {
      SetVehicleExtraColours(vehicle, props.pearlescentColor, wheelColor);
    }
    if (typeof props.interiorColor === 'number') {
      // Upstream calls SetVehicleInteriorColor (no `u`) AND
      // SetVehicleInteriorColour — the typo'd one is the legacy
      // alias and exists in modern FXServer too. We use the
      // British-spelling one. Calling either works.
      (SetVehicleInteriorColour as (v: number, c: number) => void)(
        vehicle,
        props.interiorColor
      );
    }
    if (typeof props.dashboardColor === 'number') {
      SetVehicleDashboardColour(vehicle, props.dashboardColor);
    }
    if (typeof props.wheelColor === 'number') {
      SetVehicleExtraColours(
        vehicle,
        (props.pearlescentColor as number) ?? pearlescentColor,
        props.wheelColor
      );
    }
    if (typeof props.wheels === 'number') {
      SetVehicleWheelType(vehicle, props.wheels);
    }
    if (props.tireHealth && typeof props.tireHealth === 'object') {
      for (const [wheelIndex, health] of Object.entries(
        props.tireHealth as Record<string, number>
      )) {
        SetVehicleWheelHealth(vehicle, Number(wheelIndex), health);
      }
    }
    if (props.tireBurstState && typeof props.tireBurstState === 'object') {
      for (const [wheelIndex, burst] of Object.entries(
        props.tireBurstState as Record<string, boolean>
      )) {
        if (burst) {
          SetVehicleTyreBurst(vehicle, Number(wheelIndex), false, 1000.0);
        }
      }
    }
    if (
      props.tireBurstCompletely &&
      typeof props.tireBurstCompletely === 'object'
    ) {
      for (const [wheelIndex, burst] of Object.entries(
        props.tireBurstCompletely as Record<string, boolean>
      )) {
        if (burst) {
          SetVehicleTyreBurst(vehicle, Number(wheelIndex), true, 1000.0);
        }
      }
    }
    if (typeof props.windowTint === 'number') {
      SetVehicleWindowTint(vehicle, props.windowTint);
    }
    if (props.windowStatus && typeof props.windowStatus === 'object') {
      for (const [windowIndex, intact] of Object.entries(
        props.windowStatus as Record<string, boolean>
      )) {
        if (!intact) SmashVehicleWindow(vehicle, Number(windowIndex));
      }
    }
    if (props.doorStatus && typeof props.doorStatus === 'object') {
      for (const [doorIndex, broken] of Object.entries(
        props.doorStatus as Record<string, boolean>
      )) {
        if (broken) {
          SetVehicleDoorBroken(vehicle, Number(doorIndex), true);
        }
      }
    }
    if (Array.isArray(props.neonEnabled)) {
      const ne = props.neonEnabled as boolean[];
      SetVehicleNeonLightEnabled(vehicle, 0, !!ne[0]);
      SetVehicleNeonLightEnabled(vehicle, 1, !!ne[1]);
      SetVehicleNeonLightEnabled(vehicle, 2, !!ne[2]);
      SetVehicleNeonLightEnabled(vehicle, 3, !!ne[3]);
    }
    if (Array.isArray(props.neonColor)) {
      const nc = props.neonColor as number[];
      SetVehicleNeonLightsColour(vehicle, nc[0], nc[1], nc[2]);
    }
    if (typeof props.wheelSize === 'number') {
      SetVehicleWheelSize(vehicle, props.wheelSize);
    }
    if (typeof props.wheelWidth === 'number') {
      SetVehicleWheelWidth(vehicle, props.wheelWidth);
    }
    if (Array.isArray(props.tyreSmokeColor)) {
      const ts = props.tyreSmokeColor as number[];
      SetVehicleTyreSmokeColor(vehicle, ts[0], ts[1], ts[2]);
    }

    // Mod slots — same conditional pattern upstream uses. `false` for
    // SetVehicleMod's customTires arg; modCustomTiresF/R override
    // separately below.
    const setMod = (slot: number, key: string, custom = false) => {
      const v = props[key];
      if (typeof v === 'number') SetVehicleMod(vehicle, slot, v, custom);
    };
    setMod(0, 'modSpoilers');
    setMod(1, 'modFrontBumper');
    setMod(2, 'modRearBumper');
    setMod(3, 'modSideSkirt');
    setMod(4, 'modExhaust');
    setMod(5, 'modFrame');
    setMod(6, 'modGrille');
    setMod(7, 'modHood');
    setMod(8, 'modFender');
    setMod(9, 'modRightFender');
    setMod(10, 'modRoof');
    setMod(11, 'modEngine');
    setMod(12, 'modBrakes');
    setMod(13, 'modTransmission');
    setMod(14, 'modHorns');
    setMod(15, 'modSuspension');
    setMod(16, 'modArmor');
    setMod(17, 'modKit17');
    if (typeof props.modTurbo === 'boolean') {
      ToggleVehicleMod(vehicle, 18, props.modTurbo);
    }
    setMod(19, 'modKit19');
    if (typeof props.modSmokeEnabled === 'boolean') {
      ToggleVehicleMod(vehicle, 20, props.modSmokeEnabled);
    }
    setMod(21, 'modKit21');
    if (typeof props.modXenon === 'boolean') {
      ToggleVehicleMod(vehicle, 22, props.modXenon);
    }
    if (props.xenonColor !== undefined) {
      if (Array.isArray(props.xenonColor)) {
        const xc = props.xenonColor as number[];
        SetVehicleXenonLightsCustomColor(vehicle, xc[0], xc[1], xc[2]);
      } else if (typeof props.xenonColor === 'number') {
        SetVehicleXenonLightsColor(vehicle, props.xenonColor);
      }
    }
    setMod(23, 'modFrontWheels');
    setMod(24, 'modBackWheels');
    if (typeof props.modCustomTiresF === 'boolean' && props.modCustomTiresF) {
      SetVehicleMod(vehicle, 23, props.modFrontWheels as number, true);
    }
    if (typeof props.modCustomTiresR === 'boolean' && props.modCustomTiresR) {
      SetVehicleMod(vehicle, 24, props.modBackWheels as number, true);
    }
    setMod(25, 'modPlateHolder');
    setMod(26, 'modVanityPlate');
    setMod(27, 'modTrimA');
    setMod(28, 'modOrnaments');
    setMod(29, 'modDashboard');
    setMod(30, 'modDial');
    setMod(31, 'modDoorSpeaker');
    setMod(32, 'modSeats');
    setMod(33, 'modSteeringWheel');
    setMod(34, 'modShifterLeavers');
    setMod(35, 'modAPlate');
    setMod(36, 'modSpeakers');
    setMod(37, 'modTrunk');
    setMod(38, 'modHydrolic');
    setMod(39, 'modEngineBlock');
    setMod(40, 'modAirFilter');
    setMod(41, 'modStruts');
    setMod(42, 'modArchCover');
    setMod(43, 'modAerials');
    setMod(44, 'modTrimB');
    setMod(45, 'modTank');
    setMod(46, 'modWindows');
    setMod(47, 'modKit47');
    if (typeof props.modLivery === 'number') {
      SetVehicleMod(vehicle, 48, props.modLivery, false);
      SetVehicleLivery(vehicle, props.modLivery);
    }
    setMod(49, 'modKit49');
    if (typeof props.liveryRoof === 'number') {
      SetVehicleRoofLivery(vehicle, props.liveryRoof);
    }
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
    // Direct port of upstream's `QBCore.Functions.DrawText` —
    // minimal font(4) + scale + color + Begin/End text command pair
    // with AddTextComponentSubstringPlayerName for the body. The
    // earlier draft used font(0) + DropShadow/Edge/Outline + the
    // older SetTextEntry/AddTextComponentString/DrawText API; that
    // works at runtime but renders with a different font and the
    // additional shadow/outline weight, diverging visually from
    // upstream.
    SetTextFont(4);
    SetTextScale(scale, scale);
    SetTextColour(r, g, b, a);
    BeginTextCommandDisplayText('STRING');
    AddTextComponentSubstringPlayerName(text);
    EndTextCommandDisplayText(x - width / 2, y - height / 2 + 0.005);
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

  // ---------- Bone helpers ----------
  // Direct ports of upstream's GetClosestBone / GetBoneDistance /
  // AttachProp. Used by qb-policejob (handcuff/prop attachment),
  // qb-ambulancejob (revive prop), qb-target (bone-aware zones).

  type BoneEntry = { id: number; name?: string; type?: string };
  Functions.GetClosestBone = (
    entity: number,
    list: Array<BoneEntry | number>
  ): [BoneEntry, number[], number] => {
    const playerCoords = GetEntityCoords(PlayerPedId()) as unknown as [
      number,
      number,
      number,
    ];
    let bone: BoneEntry | undefined;
    let coords: [number, number, number] | undefined;
    let dist: number | undefined;
    for (const element of list) {
      const id = typeof element === 'object' ? element.id : element;
      const boneCoords = GetWorldPositionOfEntityBone(
        entity,
        id
      ) as unknown as [number, number, number];
      const boneDistance = distance3d(playerCoords, boneCoords);
      const elementObj: BoneEntry =
        typeof element === 'object' ? element : { id: element };
      if (dist === undefined || dist > boneDistance) {
        bone = elementObj;
        coords = boneCoords;
        dist = boneDistance;
      }
    }
    if (!bone) {
      bone = {
        id: GetEntityBoneIndexByName(entity, 'bodyshell'),
        type: 'remains',
        name: 'bodyshell',
      };
      coords = GetWorldPositionOfEntityBone(
        entity,
        bone.id
      ) as unknown as [number, number, number];
      dist = distance3d(coords, playerCoords);
    }
    return [bone, coords!, dist!];
  };

  Functions.GetBoneDistance = (
    entity: number,
    boneType: number,
    boneIndex: number | string
  ): number => {
    const bone =
      boneType === 1
        ? GetPedBoneIndex(entity, boneIndex as number)
        : GetEntityBoneIndexByName(entity, boneIndex as string);
    const boneCoords = GetWorldPositionOfEntityBone(
      entity,
      bone
    ) as unknown as [number, number, number];
    const playerCoords = GetEntityCoords(PlayerPedId()) as unknown as [
      number,
      number,
      number,
    ];
    return distance3d(boneCoords, playerCoords);
  };

  Functions.AttachProp = async (
    ped: number,
    model: string | number,
    boneId: number,
    x: number,
    y: number,
    z: number,
    xR: number,
    yR: number,
    zR: number,
    vertex?: boolean
  ): Promise<number> => {
    const modelHash =
      typeof model === 'string' ? GetHashKey(model) : model;
    const bone = GetPedBoneIndex(ped, boneId);
    await (Functions.LoadModel as (m: number) => Promise<void>)(modelHash);
    const prop = CreateObject(modelHash, 1.0, 1.0, 1.0, true, true, false);
    AttachEntityToEntity(
      prop,
      ped,
      bone,
      x,
      y,
      z,
      xR,
      yR,
      zR,
      true,
      true,
      false,
      true,
      vertex ? 0 : 2,
      true
    );
    SetModelAsNoLongerNeeded(modelHash);
    return prop;
  };

  // ---------- Particle helpers ----------

  Functions.StartParticleAtCoord = async (
    dict: string,
    ptName: string,
    looped: boolean,
    coords: { x: number; y: number; z: number } | undefined,
    rot: { x: number; y: number; z: number },
    scale?: number,
    alpha?: number,
    color?: { r: number; g: number; b: number },
    duration?: number
  ): Promise<number | undefined> => {
    const c = coords
      ? coords
      : (() => {
          const co = GetEntityCoords(PlayerPedId()) as unknown as [
            number,
            number,
            number,
          ];
          return { x: co[0], y: co[1], z: co[2] };
        })();
    await (Functions.LoadParticleDictionary as (d: string) => Promise<void>)(
      dict
    );
    UseParticleFxAssetNextCall(dict);
    (SetPtfxAssetNextCall as unknown as (d: string) => void)(dict);
    let particleHandle: number | undefined;
    if (looped) {
      particleHandle = StartParticleFxLoopedAtCoord(
        ptName,
        c.x,
        c.y,
        c.z,
        rot.x,
        rot.y,
        rot.z,
        scale ?? 1.0,
        false,
        false,
        false,
        false
      ) as unknown as number;
      if (color) {
        SetParticleFxLoopedColour(
          particleHandle,
          color.r,
          color.g,
          color.b,
          false
        );
      }
      SetParticleFxLoopedAlpha(particleHandle, alpha ?? 10.0);
      if (duration) {
        await sleep(duration);
        StopParticleFxLooped(particleHandle, false);
      }
    } else {
      SetParticleFxNonLoopedAlpha(alpha ?? 10.0);
      if (color) {
        SetParticleFxNonLoopedColour(color.r, color.g, color.b);
      }
      StartParticleFxNonLoopedAtCoord(
        ptName,
        c.x,
        c.y,
        c.z,
        rot.x,
        rot.y,
        rot.z,
        scale ?? 1.0,
        false,
        false,
        false
      );
    }
    return particleHandle;
  };

  Functions.StartParticleOnEntity = async (
    dict: string,
    ptName: string,
    looped: boolean,
    entity: number,
    bone: number | string | undefined,
    offset: { x: number; y: number; z: number },
    rot: { x: number; y: number; z: number },
    scale: number,
    alpha?: number,
    color?: { r: number; g: number; b: number },
    evolution?: { name: string; amount: number },
    duration?: number
  ): Promise<number | undefined> => {
    await (Functions.LoadParticleDictionary as (d: string) => Promise<void>)(
      dict
    );
    UseParticleFxAssetNextCall(dict);
    let particleHandle: number | undefined;
    let boneID: number | undefined;
    if (bone !== undefined && GetEntityType(entity) === 1) {
      boneID = GetPedBoneIndex(entity, bone as number);
    } else if (bone !== undefined) {
      boneID = GetEntityBoneIndexByName(entity, bone as string);
    }
    if (looped) {
      if (bone !== undefined && boneID !== undefined) {
        particleHandle = StartParticleFxLoopedOnEntityBone(
          ptName,
          entity,
          offset.x,
          offset.y,
          offset.z,
          rot.x,
          rot.y,
          rot.z,
          boneID,
          scale,
          false,
          false,
          false
        ) as unknown as number;
      } else {
        particleHandle = StartParticleFxLoopedOnEntity(
          ptName,
          entity,
          offset.x,
          offset.y,
          offset.z,
          rot.x,
          rot.y,
          rot.z,
          scale,
          false,
          false,
          false
        ) as unknown as number;
      }
      if (evolution) {
        SetParticleFxLoopedEvolution(
          particleHandle,
          evolution.name,
          evolution.amount,
          false
        );
      }
      if (color) {
        SetParticleFxLoopedColour(
          particleHandle,
          color.r,
          color.g,
          color.b,
          false
        );
      }
      SetParticleFxLoopedAlpha(particleHandle, alpha ?? 10.0);
      if (duration) {
        await sleep(duration);
        StopParticleFxLooped(particleHandle, false);
      }
    } else {
      SetParticleFxNonLoopedAlpha(alpha ?? 10.0);
      if (color) {
        SetParticleFxNonLoopedColour(color.r, color.g, color.b);
      }
      if (bone !== undefined && boneID !== undefined) {
        StartParticleFxNonLoopedOnPedBone(
          ptName,
          entity,
          offset.x,
          offset.y,
          offset.z,
          rot.x,
          rot.y,
          rot.z,
          boneID,
          scale,
          false,
          false,
          false
        );
      } else {
        StartParticleFxNonLoopedOnEntity(
          ptName,
          entity,
          offset.x,
          offset.y,
          offset.z,
          rot.x,
          rot.y,
          rot.z,
          scale,
          false,
          false,
          false
        );
      }
    }
    return particleHandle;
  };

  // Match upstream: vehicles ONLY (no ped check) + fallback to player
  // ped coords if `coords` is omitted. The earlier draft's stricter
  // "no peds either" semantics rejected spawn locations upstream
  // would accept — broke qb-vehicleshop test-drive flow.
  Functions.SpawnClear = (
    coords: { x: number; y: number; z: number } | undefined,
    radius: number
  ): boolean => {
    const target: [number, number, number] = coords
      ? [coords.x, coords.y, coords.z]
      : (GetEntityCoords(PlayerPedId()) as unknown as [number, number, number]);
    const vehicles = GetGamePool('CVehicle') as number[];
    for (const v of vehicles) {
      const vc = GetEntityCoords(v) as unknown as [number, number, number];
      if (distance3d(vc, target) <= radius) return false;
    }
    return true;
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
    // Match upstream exactly: reassign to PlayerPedId() if invalid
    // entity, fall through to the direction calc, and return the
    // 'Cardinal Direction Error' sentinel if even that doesn't exist
    // (unreachable in practice — PlayerPedId is always valid — but
    // preserves the API surface downstream callers may compare against).
    const e = DoesEntityExist(entity) ? entity : PlayerPedId();
    if (!DoesEntityExist(e)) return 'Cardinal Direction Error';
    const heading = GetEntityHeading(e);
    if ((heading >= 0 && heading < 45) || (heading >= 315 && heading < 360))
      return 'North';
    if (heading >= 45 && heading < 135) return 'West';
    if (heading >= 135 && heading < 225) return 'South';
    if (heading >= 225 && heading < 315) return 'East';
    return 'Cardinal Direction Error';
  };

  // Match upstream's field names AND conditional-set shape exactly:
  //   - `min` (not `minute`), `ampm` (not `period`)
  //   - `formattedHour` only present when hour >= 13 (PM, hour-12)
  //   - `formattedMin` only present when min <= 9 (zero-padded string)
  // Downstream consumers (qb-hud, qb-phone) read `obj.min` / `obj.ampm`
  // — renaming silently breaks them.
  Functions.GetCurrentTime = (): {
    min: number;
    hour: number;
    ampm?: 'AM' | 'PM';
    formattedHour?: number;
    formattedMin?: string;
  } => {
    const obj: {
      min: number;
      hour: number;
      ampm?: 'AM' | 'PM';
      formattedHour?: number;
      formattedMin?: string;
    } = {
      min: GetClockMinutes(),
      hour: GetClockHours(),
    };
    if (obj.hour <= 12) {
      obj.ampm = 'AM';
    } else if (obj.hour >= 13) {
      obj.ampm = 'PM';
      obj.formattedHour = obj.hour - 12;
    }
    if (obj.min <= 9) {
      obj.formattedMin = `0${obj.min}`;
    }
    return obj;
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

  // Direct port of upstream's GetGroundHash. Uses
  // StartShapeTestCapsule (1m radius probe from z+4 down to z-2 along
  // the entity's column) and GetShapeTestResultEx, returning the full
  // upstream tuple: [materialHash, entityHit, surfaceNormal, endCoords,
  // success, retval]. JS callers destructure directly; Lua callers
  // access via array index since the JS→Lua export bridge doesn't
  // forward multi-return.
  Functions.GetGroundHash = (
    entity: number
  ): [number, number, number[], number[], boolean, number] => {
    const c = GetEntityCoords(entity) as unknown as [number, number, number];
    const num = StartShapeTestCapsule(
      c[0],
      c[1],
      c[2] + 4,
      c[0],
      c[1],
      c[2] - 2.0,
      1,
      1,
      entity,
      7
    ) as unknown as number;
    const result = (GetShapeTestResultEx as unknown as (
      n: number
    ) => [number, boolean, number[], number[], number, number])(num);
    const [retval, success, endCoords, surfaceNormal, materialHash, entityHit] =
      result;
    return [materialHash, entityHit, surfaceNormal, endCoords, success, retval];
  };
}
