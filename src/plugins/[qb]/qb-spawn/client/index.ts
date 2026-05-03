/// <reference types="@citizenfx/client" />

// Client-side port of the original qb-spawn client.lua. The
// QBCore-facing event/callback contract is preserved verbatim — every
// `qb-spawn:client:*` event, every NUI callback name, every payload
// shape matches upstream so other resources (qb-multicharacter,
// qb-apartments, qb-houses) keep working unchanged.
//
// Camera flow: same two-cam crossfade as the upstream Lua. cam1 sits
// far above the location and points down; cam2 swings into the same
// area at low altitude pointing at ground level. The crossfade gives
// the "fly into the location" feel while the player picks an option.

import { Spawns, type SpawnLocation } from '../shared/config';
import type {
  ApartmentOptionMap,
  OwnedHouse,
  SpawnSetupMessage,
} from '../shared/types';

const QBCore = (exports as any)['qb-core'].GetCoreObject();

const CAM_Z_PLUS_1 = 1500;
const CAM_Z_PLUS_2 = 50;
const POINT_CAM_Z = 75;
const POINT_CAM_Z_2 = 0;
const CAM1_TIME = 500;
const CAM2_TIME = 1000;

let choosingSpawn = false;
let cam: number | null = null;
let cam2: number | null = null;
let houseConfig: Record<string, { coords: { enter: { x: number; y: number; z: number } }; adress: string }> = {};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function destroyCams(): void {
  if (cam !== null && DoesCamExist(cam)) {
    SetCamActive(cam, false);
    DestroyCam(cam, true);
  }
  if (cam2 !== null && DoesCamExist(cam2)) {
    SetCamActive(cam2, false);
    DestroyCam(cam2, true);
  }
  cam = null;
  cam2 = null;
}

function setDisplay(value: boolean): void {
  choosingSpawn = value;
  SetNuiFocus(value, value);
  SendNUIMessage({ action: 'showUi', status: value });
}

interface CamCoords {
  x: number;
  y: number;
  z: number;
}

/** Matches the upstream `SetCam` helper: builds two new cams over the
 *  given coords and crossfades from the current camera into them. The
 *  player's ped is also moved to the location so it loads in. */
async function flyToLocation(target: CamCoords): Promise<void> {
  const newCam2 = CreateCamWithParams(
    'DEFAULT_SCRIPTED_CAMERA',
    target.x,
    target.y,
    target.z + CAM_Z_PLUS_1,
    300.0,
    0.0,
    0.0,
    110.0,
    false,
    0
  );
  PointCamAtCoord(newCam2, target.x, target.y, target.z + POINT_CAM_Z);
  SetCamActiveWithInterp(newCam2, cam ?? 0, CAM1_TIME, 1, 1);
  if (cam !== null && DoesCamExist(cam)) {
    DestroyCam(cam, true);
  }
  cam2 = newCam2;
  await wait(CAM1_TIME);

  const newCam1 = CreateCamWithParams(
    'DEFAULT_SCRIPTED_CAMERA',
    target.x,
    target.y,
    target.z + CAM_Z_PLUS_2,
    300.0,
    0.0,
    0.0,
    110.0,
    false,
    0
  );
  PointCamAtCoord(newCam1, target.x, target.y, target.z + POINT_CAM_Z_2);
  SetCamActiveWithInterp(newCam1, cam2, CAM2_TIME, 1, 1);
  cam = newCam1;
  SetEntityCoords(PlayerPedId(), target.x, target.y, target.z, false, false, false, true);
}

// ---------- Event handlers ----------

onNet('qb-spawn:client:openUI', (value: boolean) => {
  SetEntityVisible(PlayerPedId(), false, false);
  DoScreenFadeOut(250);
  // try/catch around the IIFE: a thrown error in a detached `void
  // (async () => {...})()` silently rejects the Promise, the UI
  // never shows, and the handler appears to have "succeeded" — that
  // bug class swallowed a parallel-build symptom for a while. Cheap
  // safety net for any future regression.
  void (async () => {
    try {
      await wait(1000);
      DoScreenFadeIn(250);

      let pos: { x: number; y: number; z: number } | undefined;
      try {
        const playerData = QBCore.Functions.GetPlayerData();
        pos = playerData?.position;
      } catch {
        // GetPlayerData isn't ready — skip the cam and just show the
        // UI. No cam is better than no UI.
      }
      if (pos) {
        cam = CreateCamWithParams(
          'DEFAULT_SCRIPTED_CAMERA',
          pos.x,
          pos.y,
          pos.z + CAM_Z_PLUS_1,
          -85.0,
          0.0,
          0.0,
          100.0,
          false,
          0
        );
        SetCamActive(cam, true);
        RenderScriptCams(true, false, 1, true, true);
      }

      await wait(500);
      setDisplay(value);
    } catch (e) {
      console.error('[qb-spawn] openUI handler crashed:', e);
    }
  })();
});

onNet(
  'qb-houses:client:setHouseConfig',
  (config: typeof houseConfig) => {
    houseConfig = config ?? {};
  }
);

onNet(
  'qb-spawn:client:setupSpawns',
  (
    cData: { citizenid: string } | null | undefined,
    isNew: boolean,
    apps: ApartmentOptionMap
  ) => {
    if (!isNew) {
      QBCore.Functions.TriggerCallback(
        'qb-spawn:server:getOwnedHouses',
        (houses: Array<{ house: string }> | null) => {
          const myHouses: OwnedHouse[] = [];
          if (Array.isArray(houses)) {
            for (const row of houses) {
              const cfg = houseConfig[row.house];
              if (cfg) {
                myHouses.push({ house: row.house, label: cfg.adress });
              }
            }
          }
          // 500ms wait mirrors upstream — the UI side bumped a layout
          // pass between message and the houses appearing. Keeping the
          // timing identical avoids surprising consumers.
          setTimeout(() => {
            const message: SpawnSetupMessage = {
              action: 'setupLocations',
              locations: Spawns,
              houses: myHouses,
              isNew: false,
            };
            SendNUIMessage(message);
          }, 500);
        },
        cData?.citizenid
      );
    } else {
      const message: SpawnSetupMessage = {
        action: 'setupAppartements',
        locations: apps,
        isNew: true,
      };
      SendNUIMessage(message);
    }
  }
);

// ---------- NUI callbacks ----------

interface NuiCb {
  (response: 'ok'): void;
}

RegisterNuiCallback('exit', (_data: unknown, cb: NuiCb) => {
  SetNuiFocus(false, false);
  SendNUIMessage({ action: 'showUi', status: false });
  choosingSpawn = false;
  cb('ok');
});

RegisterNuiCallback(
  'setCam',
  async (data: { posname: string; type: string }, cb: NuiCb) => {
    const location = String(data.posname);
    const type = String(data.type);

    DoScreenFadeOut(200);
    await wait(500);
    DoScreenFadeIn(200);
    destroyCams();

    if (type === 'current') {
      const pd = QBCore.Functions.GetPlayerData();
      if (pd?.position) {
        await flyToLocation({
          x: pd.position.x,
          y: pd.position.y,
          z: pd.position.z,
        });
      }
    } else if (type === 'house') {
      const enter = houseConfig[location]?.coords?.enter;
      if (enter) await flyToLocation(enter);
    } else if (type === 'normal') {
      const spawn: SpawnLocation | undefined = Spawns[location];
      if (spawn) await flyToLocation(spawn.coords);
    } else if (type === 'appartment') {
      // Apartments.Locations is exported by qb-apartments at runtime.
      // We don't have direct types for it; treat as opaque.
      const apartments = (globalThis as any).Apartments;
      const enter = apartments?.Locations?.[location]?.coords?.enter;
      if (enter) await flyToLocation(enter);
    }
    cb('ok');
  }
);

RegisterNuiCallback(
  'chooseAppa',
  async (data: { appType: string }, cb: NuiCb) => {
    const ped = PlayerPedId();
    const appaYeet = data.appType;
    setDisplay(false);
    DoScreenFadeOut(500);
    await wait(5000);
    const apartments = (globalThis as any).Apartments;
    const label = apartments?.Locations?.[appaYeet]?.label ?? appaYeet;
    emitNet('apartments:server:CreateApartment', appaYeet, label, true);
    emitNet('QBCore:Server:OnPlayerLoaded');
    emit('QBCore:Client:OnPlayerLoaded');
    FreezeEntityPosition(ped, false);
    RenderScriptCams(false, true, 500, true, true);
    destroyCams();
    SetEntityVisible(ped, true, false);
    cb('ok');
  }
);

async function preSpawnPlayer(): Promise<void> {
  setDisplay(false);
  DoScreenFadeOut(500);
  await wait(2000);
}

async function postSpawnPlayer(ped: number): Promise<void> {
  FreezeEntityPosition(ped, false);
  RenderScriptCams(false, true, 500, true, true);
  destroyCams();
  SetEntityVisible(PlayerPedId(), true, false);
  await wait(500);
  DoScreenFadeIn(250);
}

RegisterNuiCallback(
  'spawnplayer',
  async (data: { spawnloc: string; typeLoc: string }, cb: NuiCb) => {
    const location = String(data.spawnloc);
    const type = String(data.typeLoc);
    let ped = PlayerPedId();
    const playerData = QBCore.Functions.GetPlayerData();
    const insideMeta = playerData?.metadata?.inside;

    if (type === 'current') {
      await preSpawnPlayer();
      const pd = QBCore.Functions.GetPlayerData();
      ped = PlayerPedId();
      if (pd?.position) {
        SetEntityCoords(
          ped,
          pd.position.x,
          pd.position.y,
          pd.position.z,
          false,
          false,
          false,
          true
        );
        SetEntityHeading(ped, pd.position.a ?? 0);
      }
      FreezeEntityPosition(ped, false);

      if (insideMeta?.house) {
        emit('qb-houses:client:LastLocationHouse', insideMeta.house);
      } else if (
        insideMeta?.apartment?.apartmentType !== undefined ||
        insideMeta?.apartment?.apartmentId !== undefined
      ) {
        emit(
          'qb-apartments:client:LastLocationHouse',
          insideMeta.apartment.apartmentType,
          insideMeta.apartment.apartmentId
        );
      }
      emitNet('QBCore:Server:OnPlayerLoaded');
      emit('QBCore:Client:OnPlayerLoaded');
      await postSpawnPlayer(ped);
    } else if (type === 'house') {
      await preSpawnPlayer();
      emit('qb-houses:client:enterOwnedHouse', location);
      emitNet('QBCore:Server:OnPlayerLoaded');
      emit('QBCore:Client:OnPlayerLoaded');
      emitNet('qb-houses:server:SetInsideMeta', 0, false);
      emitNet('qb-apartments:server:SetInsideMeta', 0, 0, false);
      await postSpawnPlayer(ped);
    } else if (type === 'normal') {
      const spawn = Spawns[location];
      if (spawn) {
        await preSpawnPlayer();
        SetEntityCoords(
          ped,
          spawn.coords.x,
          spawn.coords.y,
          spawn.coords.z,
          false,
          false,
          false,
          true
        );
        emitNet('QBCore:Server:OnPlayerLoaded');
        emit('QBCore:Client:OnPlayerLoaded');
        emitNet('qb-houses:server:SetInsideMeta', 0, false);
        emitNet('qb-apartments:server:SetInsideMeta', 0, 0, false);
        await wait(500);
        SetEntityCoords(
          ped,
          spawn.coords.x,
          spawn.coords.y,
          spawn.coords.z,
          false,
          false,
          false,
          true
        );
        SetEntityHeading(ped, spawn.coords.w);
        await postSpawnPlayer(ped);
      }
    }
    cb('ok');
  }
);

// ---------- Disable controls while picking a spawn ----------

setTick(() => {
  if (choosingSpawn) {
    DisableAllControlActions(0);
  }
});
