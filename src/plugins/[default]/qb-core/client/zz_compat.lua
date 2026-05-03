-- Multi-return FFI shim for the TS port.
--
-- Upstream qb-core's GetClosestPlayer / GetClosestPed / GetClosestVehicle /
-- GetClosestObject return TWO Lua values (entityId, distance). Our TS port
-- returns a JS array `[id, dist]` which crosses the JS→Lua boundary as a
-- single Lua table — so Lua callers like
--
--     local p, d = QBCore.Functions.GetClosestPlayer()
--
-- got `p = {table}, d = nil`, then comparing `d < someNumber` blew up
-- (e.g. qb-smallresources/client/tackle.lua:24).
--
-- Why we don't `type(orig) == 'function'`: when a JS object containing
-- methods crosses CFX's V8→Lua FFI, those methods come through as
-- *callable tables* (a table with a __call metatable), not Lua functions.
-- `type()` returns 'table', but invoking them works. So we accept any
-- non-nil value here.

local MULTI_RETURN_FNS = {
    'GetClosestPlayer',
    'GetClosestPed',
    'GetClosestVehicle',
    'GetClosestObject',
}

local self_exports = exports['qb-core']

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
    return patchCore(self_exports:_GetCoreObject_Internal(filters))
end)

for _, name in ipairs(MULTI_RETURN_FNS) do
    local internal = '_' .. name .. '_Internal'
    exports(name, function(...)
        local r = self_exports[internal](self_exports, ...)
        if type(r) == 'table' then
            return r[1], r[2]
        end
        return r
    end)
end
