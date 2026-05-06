local QBCore = exports['qb-core']:GetCoreObject()
local camZPlus1 = 1500
local camZPlus2 = 50
local pointCamCoords = 75
local pointCamCoords2 = 0
local cam1Time = 500
local cam2Time = 1000
local choosingSpawn = false
local Houses = {}
local cam = nil
local cam2 = nil

-- u-core: locale state cached on the client. Resolved server-side via
-- the qb-spawn:server:getLocale callback at openUI time, and refreshed
-- by QBCore:Locale:Changed for mid-session swaps. We hold it locally so
-- the listener has somewhere to compare against if we add gating later.
local currentLocale = nil

-- u-core: pause-menu/quit-warning suspension. Three-way coverage matches
-- qb-multicharacter (project_nui_focus_suspension memory):
--   - IsPauseMenuActive       — ESC pause menu
--   - IsWarningMessageActive  — "Are you sure you want to quit" prompt
--                               (pause flips false there, this flips true)
--   - window.blur from React  — FiveM X-button / ALT+F4 prompt, which
--                               neither Lua check detects
-- choosingSpawn doubles as our nuiOpen flag (set in SetDisplay).
-- nuiHidden tracks whether the pause-menu poll has temporarily suspended
-- us; reset on every SetDisplay call so a fresh session starts clean.
local nuiHidden = false

-- Functions

-- u-core: swap THIS resource's `Lang.phrases` to the given locale's
-- phrases. We can't use qb-core's `ApplyLocaleToResource` export — exports
-- run in the *exporting* resource's Lua state, so `Lang:replace(...)`
-- inside qb-core would replace qb-core's Lang, not ours. Instead we ask
-- qb-core for the phrases table (returned across the export boundary as
-- plain data) and call replace here, where `Lang` resolves to qb-spawn's
-- instance. Same pattern as qb-multicharacter's applyLocaleHere.
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
        if k:sub(0, #'ui.') then
            translations[k:sub(#'ui.' + 1)] = Lang:t(k)
        end
    end
    return translations
end

local function SetDisplay(bool)
    choosingSpawn = bool
    nuiHidden = false
    SetNuiFocus(bool, bool)
    SendNUIMessage({
        action = 'showUi',
        status = bool,
        translations = buildTranslations()
    })
end

local function suspendUI()
    if not choosingSpawn or nuiHidden then return end
    nuiHidden = true
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'setVisible', visible = false })
end

local function resumeUI()
    if not choosingSpawn or not nuiHidden then return end
    nuiHidden = false
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'setVisible', visible = true })
end

local function isMenuOrWarningActive()
    return IsPauseMenuActive() or IsWarningMessageActive()
end

CreateThread(function()
    -- 100ms is fast enough that resume-on-close feels instant; idle
    -- cost (the common case) is negligible.
    while true do
        Wait(100)
        if choosingSpawn then
            local active = isMenuOrWarningActive()
            if active and not nuiHidden then
                suspendUI()
            elseif not active and nuiHidden then
                resumeUI()
            end
        end
    end
end)

-- Events

RegisterNetEvent('qb-spawn:client:openUI', function(value)
    SetEntityVisible(PlayerPedId(), false)
    DoScreenFadeOut(250)
    Wait(1000)
    DoScreenFadeIn(250)
    QBCore.Functions.GetPlayerData(function(PlayerData)
        cam = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', PlayerData.position.x, PlayerData.position.y, PlayerData.position.z + camZPlus1, -85.00, 0.00, 0.00, 100.00, false, 0)
        SetCamActive(cam, true)
        RenderScriptCams(true, false, 1, true, true)
    end)
    Wait(500)
    -- u-core: resolve the player's persisted locale and apply it to our
    -- own Lang BEFORE SetDisplay, so the first showUi message ships the
    -- translations dictionary in their language. The callback is fast —
    -- the server cache is warm by this point (PlayerLoaded fired during
    -- loadUserData earlier in the login flow).
    QBCore.Functions.TriggerCallback('qb-spawn:server:getLocale', function(code)
        if type(code) == 'string' then
            currentLocale = code
            applyLocaleHere(code)
        end
        SetDisplay(value)
    end)
end)

RegisterNetEvent('qb-houses:client:setHouseConfig', function(houseConfig)
    Houses = houseConfig
end)

RegisterNetEvent('qb-spawn:client:setupSpawns', function(cData, new, apps)
    if not new then
        QBCore.Functions.TriggerCallback('qb-spawn:server:getOwnedHouses', function(houses)
            local myHouses = {}
            if houses ~= nil then
                for i = 1, (#houses), 1 do
                    myHouses[#myHouses + 1] = {
                        house = houses[i].house,
                        label = Houses[houses[i].house].adress,
                    }
                end
            end

            Wait(500)
            SendNUIMessage({
                action = 'setupLocations',
                locations = QB.Spawns,
                houses = myHouses,
                isNew = new
            })
        end, cData.citizenid)
    elseif new then
        SendNUIMessage({
            action = 'setupAppartements',
            locations = apps,
            isNew = new
        })
    end
end)

-- NUI Callbacks

RegisterNUICallback('exit', function(_, cb)
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = 'showUi',
        status = false
    })
    choosingSpawn = false
    nuiHidden = false
    cb('ok')
end)

-- u-core: "Back" button — return to qb-multicharacter. Server logs the
-- player out so re-selecting a character runs the full Login path
-- cleanly. Tear down our own NUI/cams here; multichar's chooseChar
-- handler does its own fade + sky cam.
RegisterNUICallback('goBackToMulti', function(_, cb)
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = 'showUi',
        status = false
    })
    choosingSpawn = false
    nuiHidden = false
    if DoesCamExist(cam) then DestroyCam(cam, true) end
    if DoesCamExist(cam2) then DestroyCam(cam2, true) end
    RenderScriptCams(false, false, 0, true, true)
    TriggerServerEvent('qb-spawn:server:goBackToMulti')
    cb('ok')
end)

-- u-core: window-focus handshake from React. Covers the FiveM X-button
-- quit prompt (and ALT+TAB) which neither IsPauseMenuActive nor
-- IsWarningMessageActive detect from Lua.
RegisterNUICallback('uiBlurred', function(_, cb)
    if choosingSpawn then
        SetNuiFocus(false, false)
    end
    cb('ok')
end)

RegisterNUICallback('uiFocused', function(_, cb)
    -- Only restore focus when we're still in session AND the pause-menu
    -- poll isn't holding it. If a pause menu is up when the user
    -- ALT+TABs back, we don't want to grab focus from it just because
    -- OS-level focus returned to the game window.
    if choosingSpawn and not nuiHidden and not isMenuOrWarningActive() then
        SetNuiFocus(true, true)
    end
    cb('ok')
end)

local function SetCam(campos)
    cam2 = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', campos.x, campos.y, campos.z + camZPlus1, 300.00, 0.00, 0.00, 110.00, false, 0)
    PointCamAtCoord(cam2, campos.x, campos.y, campos.z + pointCamCoords)
    SetCamActiveWithInterp(cam2, cam, cam1Time, true, true)
    if DoesCamExist(cam) then
        DestroyCam(cam, true)
    end
    Wait(cam1Time)

    cam = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', campos.x, campos.y, campos.z + camZPlus2, 300.00, 0.00, 0.00, 110.00, false, 0)
    PointCamAtCoord(cam, campos.x, campos.y, campos.z + pointCamCoords2)
    SetCamActiveWithInterp(cam, cam2, cam2Time, true, true)
    SetEntityCoords(PlayerPedId(), campos.x, campos.y, campos.z)
end

RegisterNUICallback('setCam', function(data, cb)
    local location = tostring(data.posname)
    local type = tostring(data.type)
    DoScreenFadeOut(200)
    Wait(500)
    DoScreenFadeIn(200)
    if DoesCamExist(cam) then DestroyCam(cam, true) end
    if DoesCamExist(cam2) then DestroyCam(cam2, true) end
    if type == 'current' then
        QBCore.Functions.GetPlayerData(function(PlayerData)
            SetCam(PlayerData.position)
        end)
    elseif type == 'house' then
        SetCam(Houses[location].coords.enter)
    elseif type == 'normal' then
        SetCam(QB.Spawns[location].coords)
    elseif type == 'appartment' then
        SetCam(Apartments.Locations[location].coords.enter)
    end
    cb('ok')
end)

RegisterNUICallback('chooseAppa', function(data, cb)
    local ped = PlayerPedId()
    local appaYeet = data.appType
    SetDisplay(false)
    DoScreenFadeOut(500)
    Wait(5000)
    TriggerServerEvent('apartments:server:CreateApartment', appaYeet, Apartments.Locations[appaYeet].label, true)
    TriggerServerEvent('QBCore:Server:OnPlayerLoaded')
    TriggerEvent('QBCore:Client:OnPlayerLoaded')
    FreezeEntityPosition(ped, false)
    RenderScriptCams(false, true, 500, true, true)
    SetCamActive(cam, false)
    DestroyCam(cam, true)
    SetCamActive(cam2, false)
    DestroyCam(cam2, true)
    SetEntityVisible(ped, true)
    cb('ok')
end)

local function PreSpawnPlayer()
    SetDisplay(false)
    DoScreenFadeOut(500)
    Wait(2000)
end

local function PostSpawnPlayer(ped)
    FreezeEntityPosition(ped, false)
    RenderScriptCams(false, true, 500, true, true)
    SetCamActive(cam, false)
    DestroyCam(cam, true)
    SetCamActive(cam2, false)
    DestroyCam(cam2, true)
    SetEntityVisible(PlayerPedId(), true)
    Wait(500)
    DoScreenFadeIn(250)
end

RegisterNUICallback('spawnplayer', function(data, cb)
    local location = tostring(data.spawnloc)
    local type = tostring(data.typeLoc)
    local ped = PlayerPedId()
    local PlayerData = QBCore.Functions.GetPlayerData()
    local insideMeta = PlayerData.metadata['inside']
    if type == 'current' then
        PreSpawnPlayer()
        QBCore.Functions.GetPlayerData(function(pd)
            ped = PlayerPedId()
            SetEntityCoords(ped, pd.position.x, pd.position.y, pd.position.z)
            SetEntityHeading(ped, pd.position.a)
            FreezeEntityPosition(ped, false)
        end)

        if insideMeta.house ~= nil then
            local houseId = insideMeta.house
            TriggerEvent('qb-houses:client:LastLocationHouse', houseId)
        elseif insideMeta.apartment.apartmentType ~= nil or insideMeta.apartment.apartmentId ~= nil then
            local apartmentType = insideMeta.apartment.apartmentType
            local apartmentId = insideMeta.apartment.apartmentId
            TriggerEvent('qb-apartments:client:LastLocationHouse', apartmentType, apartmentId)
        end
        TriggerServerEvent('QBCore:Server:OnPlayerLoaded')
        TriggerEvent('QBCore:Client:OnPlayerLoaded')
        PostSpawnPlayer()
    elseif type == 'house' then
        PreSpawnPlayer()
        TriggerEvent('qb-houses:client:enterOwnedHouse', location)
        TriggerServerEvent('QBCore:Server:OnPlayerLoaded')
        TriggerEvent('QBCore:Client:OnPlayerLoaded')
        TriggerServerEvent('qb-houses:server:SetInsideMeta', 0, false)
        TriggerServerEvent('qb-apartments:server:SetInsideMeta', 0, 0, false)
        PostSpawnPlayer()
    elseif type == 'normal' then
        local pos = QB.Spawns[location].coords
        PreSpawnPlayer()
        SetEntityCoords(ped, pos.x, pos.y, pos.z)
        TriggerServerEvent('QBCore:Server:OnPlayerLoaded')
        TriggerEvent('QBCore:Client:OnPlayerLoaded')
        TriggerServerEvent('qb-houses:server:SetInsideMeta', 0, false)
        TriggerServerEvent('qb-apartments:server:SetInsideMeta', 0, 0, false)
        Wait(500)
        SetEntityCoords(ped, pos.x, pos.y, pos.z)
        SetEntityHeading(ped, pos.w)
        PostSpawnPlayer()
    end
    cb('ok')
end)

-- u-core: when the local player's locale changes (via the multichar
-- picker or any other resource that calls SetPlayerLocale), swap our
-- Lang phrases for the new locale and — if we're currently visible —
-- push fresh translations into the open NUI. SendNUIMessage is
-- resource-scoped, so this relay has to live here; qb-core can't
-- broadcast directly into our iframe.
RegisterNetEvent('QBCore:Locale:Changed', function(code)
    if type(code) ~= 'string' then return end
    currentLocale = code
    applyLocaleHere(code)
    if choosingSpawn then
        SendNUIMessage({
            action = 'localeChanged',
            translations = buildTranslations(),
        })
    end
end)

-- Threads

CreateThread(function()
    while true do
        Wait(0)
        if choosingSpawn then
            DisableAllControlActions(0)
        else
            Wait(1000)
        end
    end
end)
