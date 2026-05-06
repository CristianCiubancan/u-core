local cam = nil
local charPed = nil
local loadScreenCheckState = false
local QBCore = exports['qb-core']:GetCoreObject()
local cached_player_skins = {}

local randommodels = { -- models possible to load when choosing empty slot
    'mp_m_freemode_01',
    'mp_f_freemode_01',
}

-- Main Thread

CreateThread(function()
    while true do
        Wait(0)
        if NetworkIsSessionStarted() then
            TriggerEvent('qb-multicharacter:client:chooseChar')
            return
        end
    end
end)

-- Functions

local function loadModel(model)
    RequestModel(model)
    while not HasModelLoaded(model) do
        Wait(0)
    end
end

local function initializePedModel(model, data)
    CreateThread(function()
        if not model then
            model = joaat(randommodels[math.random(#randommodels)])
        end
        loadModel(model)
        charPed = CreatePed(2, model, Config.PedCoords.x, Config.PedCoords.y, Config.PedCoords.z - 0.98, Config.PedCoords.w, false, true)
        SetPedComponentVariation(charPed, 0, 0, 0, 2)
        FreezeEntityPosition(charPed, false)
        SetEntityInvincible(charPed, true)
        PlaceObjectOnGroundProperly(charPed)
        SetBlockingOfNonTemporaryEvents(charPed, true)
        if data then
            TriggerEvent('qb-clothing:client:loadPlayerClothing', data, charPed)
        end
    end)
end

local function skyCam(bool)
    TriggerEvent('qb-weathersync:client:DisableSync')
    if bool then
        DoScreenFadeIn(1000)
        SetTimecycleModifier('hud_def_blur')
        SetTimecycleModifierStrength(1.0)
        FreezeEntityPosition(PlayerPedId(), false)
        cam = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', Config.CamCoords.x, Config.CamCoords.y, Config.CamCoords.z, 0.0, 0.0, Config.CamCoords.w, 60.00, false, 0)
        SetCamActive(cam, true)
        RenderScriptCams(true, false, 1, true, true)
    else
        SetTimecycleModifier('default')
        SetCamActive(cam, false)
        DestroyCam(cam, true)
        RenderScriptCams(false, false, 1, true, true)
        FreezeEntityPosition(PlayerPedId(), false)
    end
end

-- u-core: locale state cached on the client. The server-side
-- GetNumberOfCharacters callback returns the player's resolved locale
-- on first open, and QBCore:Locale:Changed updates it mid-session.
-- We hold it here so a re-open (e.g. /logout) re-renders without
-- needing the server roundtrip to know what locale we're on.
local currentLocale = nil
local localeManifest = nil

-- u-core: swap THIS resource's `Lang.phrases` to the given locale's
-- phrases. We can't use qb-core's `ApplyLocaleToResource` export for
-- this — exports run in the *exporting* resource's Lua state, so
-- `Lang:replace(...)` inside qb-core would replace qb-core's Lang,
-- not ours. Instead we ask qb-core for the phrases table (returned
-- across the export boundary as plain data) and call replace here,
-- where `Lang` resolves to qb-multicharacter's instance.
local function applyLocaleHere(code)
    if type(code) ~= 'string' then return false end
    local ok, phrases = pcall(function()
        return exports['qb-core']:LoadLocalePhrases(GetCurrentResourceName(), code)
    end)
    if not ok or type(phrases) ~= 'table' then return false end
    if not Lang or type(Lang.replace) ~= 'function' then return false end
    Lang:replace(phrases)
    return true
end

local function buildTranslations()
    local translations = {}
    for k in pairs(Lang.fallback and Lang.fallback.phrases or Lang.phrases) do
        if k:sub(0, ('ui.'):len()) then
            translations[k:sub(('ui.'):len() + 1)] = Lang:t(k)
        end
    end
    return translations
end

-- u-core: pause-menu suspension. When the player opens the GTA pause
-- menu (ESC) while our character select is up, we hide the React UI
-- and release NUI focus so the pause menu reads cleanly. If the
-- player closes the pause menu without quitting, we restore both.
--   nuiOpen   — true between openCharMenu(true) and a closeNUI/closeUI
--               net event. Tracks whether a multichar SESSION is
--               logically active; survives suspend/resume.
--   nuiHidden — true while the pause menu has temporarily suspended
--               us. Reset on resume so we don't loop.
local nuiOpen = false
local nuiHidden = false

local function suspendUI()
    if not nuiOpen or nuiHidden then return end
    nuiHidden = true
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'setVisible', visible = false })
end

local function resumeUI()
    if not nuiOpen or not nuiHidden then return end
    nuiHidden = false
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'setVisible', visible = true })
end

-- u-core: cover both menu states. IsPauseMenuActive only returns
-- true for the regular pause menu — when the player clicks Quit the
-- pause menu transitions to a warning screen ("Are you sure you want
-- to quit Grand Theft Auto V") and IsPauseMenuActive flips back to
-- false while IsWarningMessageActive turns true. Without checking
-- both, the React UI re-appears under the warning prompt.
local function isMenuOrWarningActive()
    return IsPauseMenuActive() or IsWarningMessageActive()
end

CreateThread(function()
    -- 100ms is fast enough that resume-on-close feels instant; idle
    -- cost (the common case) is negligible.
    while true do
        Wait(100)
        if nuiOpen then
            local active = isMenuOrWarningActive()
            if active and not nuiHidden then
                suspendUI()
            elseif not active and nuiHidden then
                resumeUI()
            end
        end
    end
end)

local function openCharMenu(bool)
    QBCore.Functions.TriggerCallback('qb-multicharacter:server:GetNumberOfCharacters', function(result, countries, locale, manifest)
        if locale then currentLocale = locale end
        if manifest then localeManifest = manifest end
        -- u-core: if the server-resolved locale differs from what this
        -- resource's Lang is currently rendering, swap our own Lang
        -- phrases first so buildTranslations() captures the right ones.
        if currentLocale then
            applyLocaleHere(currentLocale)
        end
        nuiOpen = bool and true or false
        nuiHidden = false
        SetNuiFocus(bool, bool)
        SendNUIMessage({
            action = 'ui',
            customNationality = Config.customNationality,
            toggle = bool,
            nChar = result,
            enableDeleteButton = Config.EnableDeleteButton,
            translations = buildTranslations(),
            countries = countries,
            currentLocale = currentLocale,
            availableLocales = localeManifest,
        })
        skyCam(bool)
        if not loadScreenCheckState then
            ShutdownLoadingScreenNui()
            loadScreenCheckState = true
        end
    end)
end

-- Events

RegisterNetEvent('qb-multicharacter:client:closeNUIdefault', function() -- This event is only for no starting apartments
    DeleteEntity(charPed)
    SetNuiFocus(false, false)
    DoScreenFadeOut(500)
    Wait(2000)
    SetEntityCoords(PlayerPedId(), Config.DefaultSpawn.x, Config.DefaultSpawn.y, Config.DefaultSpawn.z)
    TriggerServerEvent('QBCore:Server:OnPlayerLoaded')
    TriggerEvent('QBCore:Client:OnPlayerLoaded')
    TriggerServerEvent('qb-houses:server:SetInsideMeta', 0, false)
    TriggerServerEvent('qb-apartments:server:SetInsideMeta', 0, 0, false)
    Wait(500)
    openCharMenu()
    SetEntityVisible(PlayerPedId(), true)
    Wait(500)
    DoScreenFadeIn(250)
    TriggerEvent('qb-weathersync:client:EnableSync')
    TriggerEvent('qb-clothes:client:CreateFirstCharacter')
end)

RegisterNetEvent('qb-multicharacter:client:closeNUI', function()
    DeleteEntity(charPed)
    SetNuiFocus(false, false)
    -- u-core: drop the suspension flags so the pause-menu poll thread
    -- doesn't try to resume a session that's been closed server-side
    -- (e.g. apartments-started branch of createCharacter).
    nuiOpen = false
    nuiHidden = false
end)

RegisterNetEvent('qb-multicharacter:client:chooseChar', function()
    SetNuiFocus(false, false)
    DoScreenFadeOut(10)
    Wait(1000)
    local interior = GetInteriorAtCoords(Config.Interior.x, Config.Interior.y, Config.Interior.z - 18.9)
    LoadInterior(interior)
    while not IsInteriorReady(interior) do
        Wait(1000)
    end
    FreezeEntityPosition(PlayerPedId(), true)
    SetEntityCoords(PlayerPedId(), Config.HiddenCoords.x, Config.HiddenCoords.y, Config.HiddenCoords.z)
    Wait(1500)
    ShutdownLoadingScreen()
    ShutdownLoadingScreenNui()
    openCharMenu(true)
end)

RegisterNetEvent('qb-multicharacter:client:spawnLastLocation', function(coords, cData)
    QBCore.Functions.TriggerCallback('apartments:GetOwnedApartment', function(result)
        if result then
            TriggerEvent('apartments:client:SetHomeBlip', result.type)
            local ped = PlayerPedId()
            SetEntityCoords(ped, coords.x, coords.y, coords.z)
            SetEntityHeading(ped, coords.w)
            FreezeEntityPosition(ped, false)
            SetEntityVisible(ped, true)
            local PlayerData = QBCore.Functions.GetPlayerData()
            local insideMeta = PlayerData.metadata['inside']
            DoScreenFadeOut(500)

            if insideMeta.house then
                TriggerEvent('qb-houses:client:LastLocationHouse', insideMeta.house)
            elseif insideMeta.apartment.apartmentType and insideMeta.apartment.apartmentId then
                TriggerEvent('qb-apartments:client:LastLocationHouse', insideMeta.apartment.apartmentType, insideMeta.apartment.apartmentId)
            else
                SetEntityCoords(ped, coords.x, coords.y, coords.z)
                SetEntityHeading(ped, coords.w)
                FreezeEntityPosition(ped, false)
                SetEntityVisible(ped, true)
            end

            TriggerServerEvent('QBCore:Server:OnPlayerLoaded')
            TriggerEvent('QBCore:Client:OnPlayerLoaded')
            Wait(2000)
            DoScreenFadeIn(250)
        end
    end, cData.citizenid)
end)

-- NUI Callbacks

RegisterNUICallback('closeUI', function(_, cb)
    local cData = data.cData
    DoScreenFadeOut(10)
    TriggerServerEvent('qb-multicharacter:server:loadUserData', cData)
    openCharMenu(false)
    SetEntityAsMissionEntity(charPed, true, true)
    DeleteEntity(charPed)
    if Config.SkipSelection then
        SetNuiFocus(false, false)
        skyCam(false)
    else
        openCharMenu(false)
    end
    cb('ok')
end)

RegisterNUICallback('disconnectButton', function(_, cb)
    SetEntityAsMissionEntity(charPed, true, true)
    DeleteEntity(charPed)
    TriggerServerEvent('qb-multicharacter:server:disconnect')
    cb('ok')
end)

RegisterNUICallback('selectCharacter', function(data, cb)
    local cData = data.cData
    DoScreenFadeOut(10)
    TriggerServerEvent('qb-multicharacter:server:loadUserData', cData)
    openCharMenu(false)
    SetEntityAsMissionEntity(charPed, true, true)
    DeleteEntity(charPed)
    cb('ok')
end)

RegisterNUICallback('cDataPed', function(nData, cb)
    local cData = nData.cData
    SetEntityAsMissionEntity(charPed, true, true)
    DeleteEntity(charPed)
    if cData ~= nil then
        if not cached_player_skins[cData.citizenid] then
            local temp_model = promise.new()
            local temp_data = promise.new()

            QBCore.Functions.TriggerCallback('qb-multicharacter:server:getSkin', function(model, data)
                temp_model:resolve(model)
                temp_data:resolve(data)
            end, cData.citizenid)

            local resolved_model = Citizen.Await(temp_model)
            local resolved_data = Citizen.Await(temp_data)

            cached_player_skins[cData.citizenid] = { model = resolved_model, data = resolved_data }
        end

        local model = cached_player_skins[cData.citizenid].model
        local data = cached_player_skins[cData.citizenid].data

        model = model ~= nil and tonumber(model) or false

        if model and model ~= 0 then
            initializePedModel(model, json.decode(data))
        else
            -- u-core: no row in `playerskins` for this character (it
            -- was created via the multichar form but never customized
            -- via /clothing). Upstream falls through to a random
            -- freemode here; instead, key off the character's stored
            -- gender so the preview is at least male/female-consistent.
            -- charinfo.gender is 0 (male) or 1 (female), set by the
            -- createNewCharacter NUI callback above (see line 361).
            local gender = cData.charinfo and cData.charinfo.gender
            local fallbackModel
            if gender == 0 then
                fallbackModel = joaat('mp_m_freemode_01')
            elseif gender == 1 then
                fallbackModel = joaat('mp_f_freemode_01')
            end
            local decoded = data and json.decode(data) or nil
            if fallbackModel then
                initializePedModel(fallbackModel, decoded)
            else
                initializePedModel(nil, decoded)
            end
        end
        cb('ok')
    else
        initializePedModel()
        cb('ok')
    end
end)

-- u-core: swap the empty-slot preview ped to the freemode model
-- matching the gender the user just picked in the create form. Stable
-- 'male'/'female' codes from the NUI side avoid the locale-string
-- match upstream uses for createNewCharacter (see line 361).
RegisterNUICallback('setCreatePed', function(data, cb)
    local gender = data and data.gender
    local modelName
    if gender == 'male' then
        modelName = 'mp_m_freemode_01'
    elseif gender == 'female' then
        modelName = 'mp_f_freemode_01'
    else
        cb('ok')
        return
    end
    if charPed and DoesEntityExist(charPed) then
        SetEntityAsMissionEntity(charPed, true, true)
        DeleteEntity(charPed)
    end
    initializePedModel(joaat(modelName))
    cb('ok')
end)

-- u-core: drop the create-form preview ped when the user cancels back
-- to the grid. Without this, the random/gender-matched ped lingers on
-- screen with no slot selected.
RegisterNUICallback('clearPed', function(_, cb)
    if charPed and DoesEntityExist(charPed) then
        SetEntityAsMissionEntity(charPed, true, true)
        DeleteEntity(charPed)
    end
    -- Don't nil charPed; upstream's pattern is to leave the handle as
    -- a stale value and let the next initializePedModel reassign it.
    -- Subsequent `if charPed and DoesEntityExist(charPed)` checks
    -- correctly evaluate to false on a stale handle, so this is safe.
    cb('ok')
end)

RegisterNUICallback('setupCharacters', function(_, cb)
    QBCore.Functions.TriggerCallback('qb-multicharacter:server:setupCharacters', function(result)
        cached_player_skins = {}
        SendNUIMessage({
            action = 'setupCharacters',
            characters = result
        })
        cb('ok')
    end)
end)

RegisterNUICallback('removeBlur', function(_, cb)
    SetTimecycleModifier('default')
    cb('ok')
end)

RegisterNUICallback('createNewCharacter', function(data, cb)
    local cData = data
    DoScreenFadeOut(150)
    if cData.gender == Lang:t('ui.male') then
        cData.gender = 0
    elseif cData.gender == Lang:t('ui.female') then
        cData.gender = 1
    end
    TriggerServerEvent('qb-multicharacter:server:createCharacter', cData)
    Wait(500)
    cb('ok')
end)

RegisterNUICallback('removeCharacter', function(data, cb)
    TriggerServerEvent('qb-multicharacter:server:deleteCharacter', data.citizenid)
    DeletePed(charPed)
    TriggerEvent('qb-multicharacter:client:chooseChar')
    cb('ok')
end)

-- u-core: window-focus handshake. The React side fires these when its
-- `window` blur/focus events flip — covers the FiveM X-button quit
-- prompt (and ALT+TAB) which neither IsPauseMenuActive nor
-- IsWarningMessageActive detect from Lua.
RegisterNUICallback('uiBlurred', function(_, cb)
    if nuiOpen then
        SetNuiFocus(false, false)
    end
    cb('ok')
end)

RegisterNUICallback('uiFocused', function(_, cb)
    -- Only restore focus when the *session* is still open AND the
    -- pause-menu suspension isn't holding it. If a pause menu is up
    -- when the user ALT+TABs, we don't want to grab focus back from
    -- the pause menu just because the OS-level focus returned to the
    -- game window.
    if nuiOpen and not nuiHidden and not isMenuOrWarningActive() then
        SetNuiFocus(true, true)
    end
    cb('ok')
end)

-- u-core: locale picker wire entry. Forwards to qb-core's net handler
-- which is the source of truth (DB write + broadcast). The UI doesn't
-- swap optimistically — we wait for the QBCore:Locale:Changed echo so
-- the picker's selected value always reflects server state, even if
-- the write fails (invalid code, DB hiccup, etc.).
RegisterNUICallback('setLocale', function(data, cb)
    if type(data) == 'table' and type(data.locale) == 'string' then
        TriggerServerEvent('QBCore:Server:SetLocale', data.locale)
    end
    cb('ok')
end)

-- u-core: when the local player's locale changes (either via THIS
-- picker or any other resource that calls qb-core's SetPlayerLocale),
-- swap our Lang phrases for the new locale and push fresh
-- translations + the new code into the open NUI. SendNUIMessage is
-- resource-scoped, so this relay has to live here — qb-core can't
-- broadcast directly into our iframe.
RegisterNetEvent('QBCore:Locale:Changed', function(code)
    if type(code) ~= 'string' then return end
    currentLocale = code
    applyLocaleHere(code)
    SendNUIMessage({
        action = 'localeChanged',
        currentLocale = code,
        translations = buildTranslations(),
    })
end)
