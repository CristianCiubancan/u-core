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

// Fallback cam target for the first-spawn case (qb-multicharacter sets
// `_firstSpawn` on cData). For brand-new chars `QBCore.Functions.
// GetPlayerData().position` isn't a usable world location — it's either
// missing (no replicated PlayerData yet) or the createPed/character-
// creation interior coords. Without a fallback, openUI's `if (pos)`
// branch is skipped entirely, RenderScriptCams stays off, and the
// gameplay cam shows the player's ped at qb-multicharacter's
// HiddenCoords (the "kitchen" interior). Set in setupSpawns when
// firstSpawn=true; consumed by openUI.
let firstSpawnCamTarget: { x: number; y: number; z: number } | null = null;

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
//
// Why both `on` AND `onNet` for these events:
//
// Upstream qb-spawn registers handlers via Lua's `RegisterNetEvent`,
// which marks the event as net-allowed AND fires for LOCAL
// TriggerEvent calls. The CFX V8 runtime splits these into two
// separate registrations: `onNet(name, fn)` fires only for net events
// arriving from the server (or other clients), and `on(name, fn)`
// fires only for local `emit(name, ...)` / Lua `TriggerEvent(...)`.
//
// qb-apartments' client/main.lua fires `qb-spawn:client:openUI` and
// `qb-spawn:client:setupSpawns` via LOCAL `TriggerEvent` (lines 576-
// 586). Without the local-event registration here, those handlers
// never fire — the spawn UI never opens after createCharacter, and
// the player is stuck on the loading screen indefinitely. Symptom:
// "create char → stuck at loading, qb-spawn never appears."
//
// The `qb-houses:client:setHouseConfig` event is fired only by our
// own qb-multicharacter SERVER via `emitNet`, so `onNet` alone is
// sufficient there — kept that way to avoid noise. If a future
// downstream resource adds a local TriggerEvent for it, this will
// need the same dual-registration treatment.

const dualEvent = (
  name: string,
  handler: (...args: unknown[]) => void
): void => {
  on(name, handler);
  onNet(name, handler);
};

dualEvent('qb-spawn:client:openUI', ((...args: unknown[]) => {
  const value = args[0] as boolean;
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
      // First-spawn override: see firstSpawnCamTarget comment up top.
      // For brand-new chars `playerData.position` is either missing or
      // points at the createPed/character-creation interior, so we
      // unconditionally prefer the stashed fallback (first apartment
      // or first preset spawn). Without this the cam either never gets
      // created (gameplay cam shows the ped at HiddenCoords — the
      // "kitchen") or flies to the createPed interior.
      if (firstSpawnCamTarget) {
        pos = firstSpawnCamTarget;
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
}) as (...args: unknown[]) => void);

onNet(
  'qb-houses:client:setHouseConfig',
  (config: typeof houseConfig) => {
    houseConfig = config ?? {};
  }
);

dualEvent('qb-spawn:client:setupSpawns', ((...args: unknown[]) => {
  const cData = args[0] as
    | { citizenid: string; _firstSpawn?: boolean }
    | null
    | undefined;
  const isNew = args[1] as boolean;
  const apps = args[2] as ApartmentOptionMap;
    // u-core marker added by qb-multicharacter's createCharacter handler
    // — propagates through qb-apartments unchanged and reaches us here.
    // Tells the React UI to hide "Last Location" for this player's
    // first spawn, since `cData.position` would otherwise point at the
    // character creation interior.
    const firstSpawn = !!cData?._firstSpawn;

    // Stash a sensible fallback cam target for openUI. Prefer the first
    // apartment (Apartments.Starting=true path) since that's what the
    // player will be picking from; otherwise the first preset Spawn.
    // Static `apps` type is `{id, label}` but at runtime qb-apartments
    // hands us its full Locations table including `coords.enter`, so we
    // read it through `any`.
    if (firstSpawn) {
      let target: { x: number; y: number; z: number } | null = null;
      if (apps) {
        const firstApt = (Object.values(apps) as any[])[0];
        const enter = firstApt?.coords?.enter;
        if (enter && typeof enter.x === 'number') {
          target = { x: enter.x, y: enter.y, z: enter.z };
        }
      }
      if (!target) {
        const firstPreset = (Object.values(Spawns) as SpawnLocation[])[0];
        if (firstPreset?.coords) {
          target = {
            x: firstPreset.coords.x,
            y: firstPreset.coords.y,
            z: firstPreset.coords.z,
          };
        }
      }
      firstSpawnCamTarget = target;
    } else {
      firstSpawnCamTarget = null;
    }

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
              firstSpawn,
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
        firstSpawn,
      };
      SendNUIMessage(message);
    }
}) as (...args: unknown[]) => void);

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

/**
 * Tear down the spawn UI and re-open qb-multicharacter's character
 * selection menu. Used by the "Back" button on the spawn screen so
 * the player can change their mind without committing to a spawn.
 *
 * Note: at this point the player has already been logged in via
 * `qb-multicharacter:server:loadUserData` (existing char) or
 * `:createCharacter` (new char). Re-picking a different character
 * triggers `Player.Login` again server-side; QBCore handles the
 * swap, but server-side side effects (commands refresh, house data
 * load, routing bucket assignment for new chars) are NOT undone.
 * In practice this only matters if the player creates a NEW char,
 * goes back, then creates ANOTHER NEW char — they accumulate
 * orphaned routing buckets. Acceptable trade-off for the UX win;
 * revisit if it bites.
 */
RegisterNuiCallback('backToSelect', (_data: unknown, cb: NuiCb) => {
  setDisplay(false);
  destroyCams();
  RenderScriptCams(false, false, 0, true, true);
  emit('qb-multicharacter:client:chooseChar');
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
