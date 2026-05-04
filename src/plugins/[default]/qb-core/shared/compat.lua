-- Multi-return FFI shim for the TS port + load-order shield.
-- Runs on both client and server (shared_scripts) — same logic, the
-- only side-specific bit is the multi-return function list.
--
-- Two jobs in one file:
--
-- (1) Multi-return shim. Upstream qb-core's GetClosestPlayer / Ped /
--     Vehicle / Object (both sides) plus server-only GetPlayersByJob /
--     GetPlayersOnDuty / GetBucketObjects all use Lua's `return a, b`
--     multi-return semantics. Our TS port returns `[a, b]` JS arrays
--     which cross the V8→Lua FFI as a SINGLE Lua table — so a Lua
--     caller doing `local p, d = QBCore.Functions.GetClosestPlayer()`
--     got `p = {table}, d = nil`, then `if d < n` blew up
--     (e.g. qb-smallresources/client/tackle.lua:24).
--
--     Fix: JS-side registers these as `_<Name>_Internal`. Lua wrappers
--     here re-export the public name and `return r[1], r[2]`. The
--     `GetCoreObject` wrapper additionally patches `core.Functions[name]`
--     in place, so callers reaching multi-returns through the QBCore
--     namespace also see proper unpacking — not just direct exports.
--
-- (2) Load-order shield. Our V8 bundle is ~1MB across drawtext / events
--     / functions / index / loops / qbcore.js and takes meaningful
--     compile time on the client. Upstream qb-* resources lack
--     `dependency 'qb-core'` and call `local QBCore = exports['qb-core']
--     :GetCoreObject()` at line 1 of their client scripts. On a player
--     RECONNECT, all of this runs in parallel with our V8 init and
--     downstream wins the race — cascading "No such export GetCoreObject"
--     into ~50 dependent resources.
--
--     Fix: shared_scripts run before client_scripts/server_scripts, so
--     this file registers the public export *immediately* on both sides.
--     The wrapper bodies then `awaitInternal()` — yielding via Citizen.Wait
--     until JS has registered the matching `_<Name>_Internal`. Top-level
--     downstream Lua runs in a Citizen coroutine that can yield, so the
--     export call simply blocks briefly instead of throwing.
--
-- Why we don't `type(orig) == 'function'`: when a JS object containing
-- methods crosses CFX's V8→Lua FFI, those methods come through as
-- *callable tables* (a table with a __call metatable), not Lua functions.
-- `type()` returns 'table', but invoking them works. So we accept any
-- non-nil value here.

local IS_SERVER = IsDuplicityVersion()

local MULTI_RETURN_FNS = IS_SERVER and {
    'GetClosestPlayer',
    'GetClosestPed',
    'GetClosestVehicle',
    'GetClosestObject',
    'GetPlayersByJob',
    'GetPlayersOnDuty',
    'GetBucketObjects',
} or {
    'GetClosestPlayer',
    'GetClosestPed',
    'GetClosestVehicle',
    'GetClosestObject',
}

local self_exports = exports['qb-core']

-- Yields the current Citizen coroutine until JS has registered the
-- named internal export. 30s deadline so a genuinely-broken JS bundle
-- surfaces a real error instead of hanging the consumer indefinitely.
local function awaitInternal(name)
    local deadline = GetGameTimer() + 30000
    while GetGameTimer() < deadline do
        local ok, fn = pcall(function() return self_exports[name] end)
        if ok and fn ~= nil then return end
        Citizen.Wait(10)
    end
    error('qb-core internal export ' .. name .. ' never registered (V8 bundle failed to load?)')
end

local function patchCore(core)
    if type(core) ~= 'table' or type(core.Functions) ~= 'table' then
        return core
    end
    for _, name in ipairs(MULTI_RETURN_FNS) do
        local orig = core.Functions[name]
        if orig ~= nil then
            core.Functions[name] = function(...)
                local r = orig(...)
                if type(r) == 'table' then
                    return r[1], r[2]
                end
                return r
            end
        end
    end
    return core
end

exports('GetCoreObject', function(filters)
    awaitInternal('_GetCoreObject_Internal')
    return patchCore(self_exports:_GetCoreObject_Internal(filters))
end)

for _, name in ipairs(MULTI_RETURN_FNS) do
    local internal = '_' .. name .. '_Internal'
    exports(name, function(...)
        awaitInternal(internal)
        local r = self_exports[internal](self_exports, ...)
        if type(r) == 'table' then
            return r[1], r[2]
        end
        return r
    end)
end
