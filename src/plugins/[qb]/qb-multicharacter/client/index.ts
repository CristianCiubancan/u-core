/// <reference types="@citizenfx/client" />

// Client-side port of qb-multicharacter. Handles preview ped + camera
// rig, the NUI bridge, and the auto-trigger that fires once the session
// has joined. Event names mirror upstream verbatim — other QB resources
// still call into these strings.

import { Config } from '../shared/config';

const QBCore = (exports as any)['qb-core'].GetCoreObject();

const RANDOM_MODELS: number[] = [
  GetHashKey('mp_m_freemode_01'),
  GetHashKey('mp_f_freemode_01'),
];

let cam: number | null = null;
let charPed: number | null = null;
let loadScreenCheckState = false;
const cachedPlayerSkins: Record<
  string,
  { model: number | null; data: string | null }
> = {};

// ---------------- Helpers ----------------

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function loadModel(model: number): Promise<void> {
  RequestModel(model);
  while (!HasModelLoaded(model)) {
    await wait(0);
  }
}

async function initializePedModel(
  model: number | null,
  data: unknown
): Promise<void> {
  const resolvedModel =
    model ?? RANDOM_MODELS[Math.floor(Math.random() * RANDOM_MODELS.length)];
  await loadModel(resolvedModel);
  charPed = CreatePed(
    2,
    resolvedModel,
    Config.PedCoords.x,
    Config.PedCoords.y,
    Config.PedCoords.z - 0.98,
    Config.PedCoords.w,
    false,
    true
  );
  SetPedComponentVariation(charPed, 0, 0, 0, 2);
  FreezeEntityPosition(charPed, false);
  SetEntityInvincible(charPed, true);
  PlaceObjectOnGroundProperly(charPed);
  SetBlockingOfNonTemporaryEvents(charPed, true);
  if (data) {
    emit('qb-clothing:client:loadPlayerClothing', data, charPed);
  }
}

function destroyPed(): void {
  if (charPed !== null) {
    SetEntityAsMissionEntity(charPed, true, true);
    DeleteEntity(charPed);
    charPed = null;
  }
}

function skyCam(enable: boolean): void {
  emit('qb-weathersync:client:DisableSync');
  if (enable) {
    DoScreenFadeIn(1000);
    SetTimecycleModifier('hud_def_blur');
    SetTimecycleModifierStrength(1.0);
    FreezeEntityPosition(PlayerPedId(), false);
    cam = CreateCamWithParams(
      'DEFAULT_SCRIPTED_CAMERA',
      Config.CamCoords.x,
      Config.CamCoords.y,
      Config.CamCoords.z,
      0.0,
      0.0,
      Config.CamCoords.w,
      60.0,
      false,
      0
    );
    SetCamActive(cam, true);
    RenderScriptCams(true, false, 1, true, true);
  } else {
    SetTimecycleModifier('default');
    if (cam !== null) {
      SetCamActive(cam, false);
      DestroyCam(cam, true);
      cam = null;
    }
    RenderScriptCams(false, false, 1, true, true);
    FreezeEntityPosition(PlayerPedId(), false);
  }
}

function openCharMenu(visible: boolean): void {
  QBCore.Functions.TriggerCallback(
    'qb-multicharacter:server:GetNumberOfCharacters',
    (numChars: number, countries: string[]) => {
      SetNuiFocus(visible, visible);
      SendNUIMessage({
        action: 'ui',
        toggle: visible,
        nChar: numChars,
        customNationality: Config.customNationality,
        enableDeleteButton: Config.EnableDeleteButton,
        countries,
        // Forward the QBCore locale so the webview can mirror it via
        // i18n.changeLanguage. Replicated convar, so this reflects whatever
        // server.cfg has (`setr qb_locale "<lang>"`); falls back to en
        // when the convar is unset or empty.
        locale: GetConvar('qb_locale', 'en') || 'en',
      });
      skyCam(visible);
      if (!loadScreenCheckState) {
        ShutdownLoadingScreenNui();
        loadScreenCheckState = true;
      }
    }
  );
}

// ---------------- Auto-trigger on session join ----------------

setTick(async () => {
  if (NetworkIsSessionStarted()) {
    emit('qb-multicharacter:client:chooseChar');
    // Replace this tick with a no-op so the engine drops the loop.
    setTick(() => {});
  }
});

// ---------------- Net events ----------------

onNet('qb-multicharacter:client:closeNUIdefault', async () => {
  destroyPed();
  SetNuiFocus(false, false);
  DoScreenFadeOut(500);
  await wait(2000);
  SetEntityCoords(
    PlayerPedId(),
    Config.DefaultSpawn.x,
    Config.DefaultSpawn.y,
    Config.DefaultSpawn.z,
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
  openCharMenu(false);
  SetEntityVisible(PlayerPedId(), true, false);
  await wait(500);
  DoScreenFadeIn(250);
  emit('qb-weathersync:client:EnableSync');
  emit('qb-clothes:client:CreateFirstCharacter');
});

onNet('qb-multicharacter:client:closeNUI', () => {
  destroyPed();
  SetNuiFocus(false, false);
});

onNet('qb-multicharacter:client:chooseChar', async () => {
  SetNuiFocus(false, false);
  DoScreenFadeOut(10);
  await wait(1000);
  const interior = GetInteriorAtCoords(
    Config.Interior.x,
    Config.Interior.y,
    Config.Interior.z - 18.9
  );
  LoadInterior(interior);
  while (!IsInteriorReady(interior)) {
    await wait(1000);
  }
  FreezeEntityPosition(PlayerPedId(), true);
  SetEntityCoords(
    PlayerPedId(),
    Config.HiddenCoords.x,
    Config.HiddenCoords.y,
    Config.HiddenCoords.z,
    false,
    false,
    false,
    true
  );
  await wait(1500);
  ShutdownLoadingScreen();
  ShutdownLoadingScreenNui();
  openCharMenu(true);
});

onNet(
  'qb-multicharacter:client:spawnLastLocation',
  (coords: { x: number; y: number; z: number; w: number }, cData: any) => {
    QBCore.Functions.TriggerCallback(
      'apartments:GetOwnedApartment',
      (result: any) => {
        if (!result) return;
        emit('apartments:client:SetHomeBlip', result.type);
        const ped = PlayerPedId();
        SetEntityCoords(ped, coords.x, coords.y, coords.z, false, false, false, true);
        SetEntityHeading(ped, coords.w);
        FreezeEntityPosition(ped, false);
        SetEntityVisible(ped, true, false);
        const PlayerData = QBCore.Functions.GetPlayerData();
        const insideMeta = PlayerData.metadata.inside;
        DoScreenFadeOut(500);
        if (insideMeta?.house) {
          emit('qb-houses:client:LastLocationHouse', insideMeta.house);
        } else if (insideMeta?.apartment?.apartmentType && insideMeta?.apartment?.apartmentId) {
          emit(
            'qb-apartments:client:LastLocationHouse',
            insideMeta.apartment.apartmentType,
            insideMeta.apartment.apartmentId
          );
        } else {
          SetEntityCoords(ped, coords.x, coords.y, coords.z, false, false, false, true);
          SetEntityHeading(ped, coords.w);
          FreezeEntityPosition(ped, false);
          SetEntityVisible(ped, true, false);
        }
        emitNet('QBCore:Server:OnPlayerLoaded');
        emit('QBCore:Client:OnPlayerLoaded');
        setTimeout(() => DoScreenFadeIn(250), 2000);
      },
      cData.citizenid
    );
  }
);

// ---------------- NUI callbacks ----------------

type NuiCb = (response: unknown) => void;

RegisterNuiCallbackType('closeUI');
on('__cfx_nui:closeUI', (data: { cData?: any }, cb: NuiCb) => {
  const cData = data?.cData;
  DoScreenFadeOut(10);
  if (cData) {
    emitNet('qb-multicharacter:server:loadUserData', cData);
  }
  openCharMenu(false);
  destroyPed();
  if (Config.SkipSelection) {
    SetNuiFocus(false, false);
    skyCam(false);
  } else {
    openCharMenu(false);
  }
  cb('ok');
});

RegisterNuiCallbackType('disconnectButton');
on('__cfx_nui:disconnectButton', (_data: unknown, cb: NuiCb) => {
  destroyPed();
  emitNet('qb-multicharacter:server:disconnect');
  cb('ok');
});

RegisterNuiCallbackType('selectCharacter');
on('__cfx_nui:selectCharacter', (data: { cData: any }, cb: NuiCb) => {
  DoScreenFadeOut(10);
  emitNet('qb-multicharacter:server:loadUserData', data.cData);
  openCharMenu(false);
  destroyPed();
  cb('ok');
});

RegisterNuiCallbackType('cDataPed');
on('__cfx_nui:cDataPed', async (payload: { cData?: any }, cb: NuiCb) => {
  destroyPed();
  const cData = payload?.cData;
  if (!cData) {
    await initializePedModel(null, null);
    cb('ok');
    return;
  }

  if (!cachedPlayerSkins[cData.citizenid]) {
    const skin = await new Promise<{ model: number | null; data: string | null }>(
      (resolve) => {
        QBCore.Functions.TriggerCallback(
          'qb-multicharacter:server:getSkin',
          (model: string | null, data: string | null) => {
            const numericModel =
              model !== null && model !== undefined ? Number(model) : null;
            resolve({
              model: Number.isFinite(numericModel) ? (numericModel as number) : null,
              data: data ?? null,
            });
          },
          cData.citizenid
        );
      }
    );
    cachedPlayerSkins[cData.citizenid] = skin;
  }

  const cached = cachedPlayerSkins[cData.citizenid];
  await initializePedModel(
    cached.model,
    cached.data ? JSON.parse(cached.data) : null
  );
  cb('ok');
});

RegisterNuiCallbackType('setupCharacters');
on('__cfx_nui:setupCharacters', (_data: unknown, cb: NuiCb) => {
  QBCore.Functions.TriggerCallback(
    'qb-multicharacter:server:setupCharacters',
    (result: unknown[]) => {
      for (const k of Object.keys(cachedPlayerSkins)) delete cachedPlayerSkins[k];
      SendNUIMessage({ action: 'setupCharacters', characters: result });
      cb('ok');
    }
  );
});

RegisterNuiCallbackType('removeBlur');
on('__cfx_nui:removeBlur', (_data: unknown, cb: NuiCb) => {
  SetTimecycleModifier('default');
  cb('ok');
});

RegisterNuiCallbackType('createNewCharacter');
on('__cfx_nui:createNewCharacter', async (data: any, cb: NuiCb) => {
  DoScreenFadeOut(150);
  // Webview now sends gender as 0/1 directly so we don't have to
  // round-trip the localized 'Male'/'Female' string back through Lang.
  emitNet('qb-multicharacter:server:createCharacter', data);
  await wait(500);
  cb('ok');
});

RegisterNuiCallbackType('removeCharacter');
on('__cfx_nui:removeCharacter', (data: { citizenid: string }, cb: NuiCb) => {
  emitNet('qb-multicharacter:server:deleteCharacter', data.citizenid);
  destroyPed();
  emit('qb-multicharacter:client:chooseChar');
  cb('ok');
});
