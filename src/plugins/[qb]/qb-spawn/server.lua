local QBCore = exports['qb-core']:GetCoreObject()

QBCore.Functions.CreateCallback('qb-spawn:server:getOwnedHouses', function(_, cb, cid)
    if cid ~= nil then
        local houses = MySQL.query.await('SELECT * FROM player_houses WHERE citizenid = ?', { cid })
        if houses[1] ~= nil then
            cb(houses)
        else
            cb({})
        end
    else
        cb({})
    end
end)

-- u-core: Back-to-multichar path. Mirrors the upstream `/logout` admin
-- command pair (qb-multicharacter logout/main.lua): unload the player
-- and bounce them into the character select.
RegisterNetEvent('qb-spawn:server:goBackToMulti', function()
    local src = source
    QBCore.Player.Logout(src)
    TriggerClientEvent('qb-multicharacter:client:chooseChar', src)
end)

-- u-core: per-player locale resolver. The client calls this before
-- SetDisplay so the first showUi message ships translations in the
-- right language. EnsurePlayerLocale is cache → DB → default; warm
-- because PlayerLoaded fired during loadUserData earlier in the
-- login flow.
QBCore.Functions.CreateCallback('qb-spawn:server:getLocale', function(source, cb)
    cb(exports['qb-core']:EnsurePlayerLocale(source))
end)
