-- u-core: per-license locale system. Lives alongside upstream's
-- shared/locale.lua (the Polyglot-style Locale class) — this module
-- adds *who* is currently on what locale. It does not modify upstream
-- files. The Locale class itself stays untouched.
--
-- Storage: `player_locales` table (license → code), idempotent
-- `CREATE TABLE IF NOT EXISTS` against the dbmate migration so a
-- fresh DB without the migration applied still boots cleanly.
--
-- Caches:
--   localeBySource[src]   — fast path for "what's this player using
--                           right now". Cleared on player drop.
--   localeByLicense[lic]  — license-keyed cache used to warm the
--                           src cache on first lookup; persists for
--                           the server's lifetime.
--
-- Exports:
--   GetPlayerLocale(src)      → code or nil (sync, cache-only)
--   EnsurePlayerLocale(src)   → code (sync — license → cache → DB → default,
--                                     populates caches as side effect)
--   SetPlayerLocale(src, code)→ boolean (writes DB + broadcasts to client)
--   GetLocaleManifest()       → array of { code, name }
--   GetDefaultLocale()        → server-wide default ('en' or
--                                  QBCoreLocaleDefault from manifest)
--
-- Net handlers:
--   QBCore:Server:SetLocale (from client) — wire entry for NUI pickers.
--
-- Broadcast:
--   QBCore:Locale:Changed (TriggerClientEvent → src) — the player whose
--     locale changed gets the new code. Client side decides what to
--     reload (own resource's Lang, NUI translations, etc.).

local cacheBySource = {}
local cacheByLicense = {}
local schemaReady = false

local function defaultLocale()
    return QBCoreLocaleDefault or 'en'
end

local function isAllowed(code)
    return type(code) == 'string' and (QBCoreLocaleAllowed and QBCoreLocaleAllowed[code]) == true
end

local function getLicense(src)
    if not src or src == 0 then return nil end
    -- QBCore.Functions.GetIdentifier is in shared and depends on the player
    -- being connected. In rare bootstrapping contexts (events firing for
    -- a not-yet-fully-loaded player) we fall back to scanning identifiers
    -- ourselves so this never throws.
    local ok, license = pcall(QBCore.Functions.GetIdentifier, src, 'license')
    if ok and license then return license end
    for _, id in ipairs(GetPlayerIdentifiers(src) or {}) do
        if id:sub(1, 8) == 'license:' then return id end
    end
    return nil
end

local function ensureSchema()
    if schemaReady then return end
    -- The dbmate migration is the source of truth, but we keep this
    -- defensive CREATE so a server booting against a not-yet-migrated
    -- DB still starts (the dbmate `migrator` compose service is in
    -- the boot path; this is belt-and-braces for non-compose runs).
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `player_locales` (
            `license` VARCHAR(64) NOT NULL,
            `locale` VARCHAR(10) NOT NULL,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`license`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ]])
    schemaReady = true
end

local function loadFromDB(license)
    if not license then return nil end
    ensureSchema()
    local row = MySQL.single.await(
        'SELECT locale FROM player_locales WHERE license = ? LIMIT 1',
        { license }
    )
    if row and row.locale and isAllowed(row.locale) then
        return row.locale
    end
    return nil
end

local function writeToDB(license, code)
    if not license or not code then return false end
    ensureSchema()
    MySQL.prepare.await(
        'INSERT INTO player_locales (license, locale) VALUES (?, ?) ON DUPLICATE KEY UPDATE locale = VALUES(locale)',
        { license, code }
    )
    return true
end

local function GetPlayerLocale(src)
    return cacheBySource[src]
end

local function EnsurePlayerLocale(src)
    local cached = cacheBySource[src]
    if cached then return cached end

    local license = getLicense(src)
    if not license then return defaultLocale() end

    local byLicense = cacheByLicense[license]
    if byLicense then
        cacheBySource[src] = byLicense
        return byLicense
    end

    local fromDB = loadFromDB(license) or defaultLocale()
    cacheByLicense[license] = fromDB
    cacheBySource[src] = fromDB
    return fromDB
end

local function SetPlayerLocale(src, code)
    if not isAllowed(code) then return false end
    local license = getLicense(src)
    if not license then return false end

    cacheBySource[src] = code
    cacheByLicense[license] = code
    writeToDB(license, code)

    -- Broadcast to the affected client only — every other player's
    -- locale is unrelated. Clients react by reloading their own
    -- resources' Lang.phrases (see client/locale_pl.lua).
    TriggerClientEvent('QBCore:Locale:Changed', src, code)
    return true
end

local function GetLocaleManifest()
    return QBCoreLocaleManifest or {}
end

local function GetDefaultLocale()
    return defaultLocale()
end

exports('GetPlayerLocale', GetPlayerLocale)
exports('EnsurePlayerLocale', EnsurePlayerLocale)
exports('SetPlayerLocale', SetPlayerLocale)
exports('GetLocaleManifest', GetLocaleManifest)
exports('GetDefaultLocale', GetDefaultLocale)

-- Wire entry for NUI pickers (qb-multicharacter, future plugins).
-- Source-trusted: we accept the calling player as the target.
RegisterNetEvent('QBCore:Server:SetLocale', function(code)
    local src = source
    SetPlayerLocale(src, code)
end)

-- Drop the per-source cache when the player leaves so a re-connect
-- on a new src ID re-resolves cleanly. The license cache stays —
-- it's the warm path for the next session on this license.
AddEventHandler('playerDropped', function()
    cacheBySource[source] = nil
end)

-- Warm the cache when the player loads. Doesn't broadcast — this is
-- the initial state, not a change. Plugins that care about "what
-- locale is this player on" can call EnsurePlayerLocale at any time.
AddEventHandler('QBCore:Server:PlayerLoaded', function(Player)
    if not Player or not Player.PlayerData or not Player.PlayerData.source then return end
    EnsurePlayerLocale(Player.PlayerData.source)
end)
