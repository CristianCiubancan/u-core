-- Multi-return FFI shim for the TS port. See client/zz_compat.lua for
-- the full rationale — same pattern, different function list.
--
-- Server-side multi-return functions (upstream Lua signatures):
--   GetClosestPlayer / Ped / Vehicle / Object → (entityId, distance)
--   GetPlayersByJob / GetPlayersOnDuty       → (players[], count)
--   GetBucketObjects                         → (PlayerBuckets, EntityBuckets)
--
-- Our TS port returns each as a JS array tuple, which crosses to Lua as a
-- single table. This shim re-exports the public names with wrappers that
-- unpack `r[1], r[2]` into Lua multi-returns.

local MULTI_RETURN_FNS = {
    'GetClosestPlayer',
    'GetClosestPed',
    'GetClosestVehicle',
    'GetClosestObject',
    'GetPlayersByJob',
    'GetPlayersOnDuty',
    'GetBucketObjects',
}

local self_exports = exports['qb-core']

-- Why we don't `type(orig) == 'function'`: when a JS object containing
-- methods crosses CFX's V8→Lua FFI, those methods come through as
-- *callable tables* (a table with a __call metatable), not Lua functions.
-- `type()` returns 'table', but invoking them works. So we accept any
-- non-nil value here.
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
