-- u-core: client-side per-player locale runtime. Lives alongside
-- upstream client/main.lua. Doesn't modify upstream files.
--
-- Two responsibilities:
--   1. Track the local player's currently-selected locale code so
--      any client script can `exports['qb-core']:GetCurrentLocale()`.
--   2. Provide a helper that loads ANY resource's locale file at
--      runtime and replaces its `Lang` instance's phrases. Resources
--      that want to live-update their translations subscribe to the
--      `QBCore:Locale:Changed` event and call this helper for their
--      own resource name + the new code.
--
-- The helper sandboxes the loaded locale file via setfenv-style env
-- capture: upstream locale files end with
--     `Lang = Lang or Locale:new({ phrases = Translations, ... })`
-- so we run the file with a fake `Locale` whose `:new` records the
-- phrases and a transparent `_ENV` so everything else (vector3, etc.)
-- still resolves. We then call `Lang:replace(phrases)` (existing
-- upstream method on the real Locale class) on the resource's own
-- Lang to swap.
--
-- The helper is intentionally only useful from within the calling
-- resource (it reaches into THAT resource's `Lang` global). qb-core
-- itself uses the same path for its own translations.

local currentLocale = nil

local function GetCurrentLocale()
    return currentLocale or QBCoreLocaleDefault or 'en'
end

local function GetLocaleManifest()
    return QBCoreLocaleManifest or {}
end

--- Load a locale file from `resourceName` and return its phrases table.
--- Tries both `locale/<code>.lua` (qb-core's convention) and
--- `locales/<code>.lua` (downstream qb-* convention).
--- Returns nil if the file is missing, exec fails, or no Lang assignment
--- could be captured.
local function loadLocalePhrases(resourceName, code)
    if not resourceName or not code then return nil end
    local content = LoadResourceFile(resourceName, ('locale/%s.lua'):format(code))
                 or LoadResourceFile(resourceName, ('locales/%s.lua'):format(code))
    if not content then return nil end

    local capturedPhrases
    -- Fake Locale that records phrases without instantiating a real
    -- Polyglot object — we only want the phrases table.
    local fakeLocale = {}
    fakeLocale.new = function(_, opts)
        if opts and opts.phrases then
            capturedPhrases = opts.phrases
        end
        return fakeLocale -- non-nil so `Lang or Locale:new(...)` settles
    end

    -- Sandbox env: forward unknown reads to _G so vector3/Citizen/etc.
    -- still work, but trap writes locally so the loaded file's
    -- `Lang = ...` assignment doesn't clobber our real Lang. Lua 5.4
    -- (lua54 'yes' in qb-core's manifest) supports this directly.
    --
    -- Lang = false (NOT nil): assigning nil to a Lua table is a no-op
    -- (no key stored), so the chunk's read of `Lang` would fall through
    -- __index to _G.Lang — qb-core's own real Polyglot instance, which
    -- is truthy. That's fine for non-English locale files (their
    -- `Lang = Locale:new(...)` is unconditional inside the GetConvar
    -- guard), but breaks `en.lua`, whose only Lang line is
    -- `Lang = Lang or Locale:new(...)`: it short-circuits on qb-core's
    -- real Lang and never invokes Locale:new, so capturedPhrases stays
    -- nil and the caller treats the load as a failure. With `false`,
    -- the key IS stored, __index doesn't fire, the chunk reads false,
    -- and `false or Locale:new(...)` runs the constructor.
    --
    -- GetConvar stub: most qb-* downstream locale files gate the Lang
    -- assignment behind `if GetConvar('qb_locale', 'en') == '<code>'`.
    -- The real convar is whatever the server-default locale is, so
    -- without this stub the guard would fail when we're loading any
    -- locale file other than the server default and we'd capture
    -- nothing. We only override the locale-related convars; everything
    -- else passes through to the real GetConvar.
    local env = setmetatable({
        Locale = fakeLocale,
        Lang = false,
        GetConvar = function(name, default)
            if name == 'qb_locale' or name == 'qb-locale' or name == 'locale' then
                return code
            end
            return _G.GetConvar(name, default)
        end,
    }, { __index = _G })

    local fn, err = load(content, '@'..resourceName..'/'..code, 't', env)
    if not fn then
        print(('^1[qb-core/locale_pl] failed to compile %s/%s.lua: %s^7'):format(resourceName, code, err or 'unknown'))
        return nil
    end
    local ok, runErr = pcall(fn)
    if not ok then
        print(('^1[qb-core/locale_pl] failed to run %s/%s.lua: %s^7'):format(resourceName, code, runErr or 'unknown'))
        return nil
    end

    return capturedPhrases
end

--- Replace qb-core's own `Lang` phrases with the given locale's
--- phrases. INTERNAL — not exported. Other resources can't usefully
--- call this via export because exports run in the *exporting*
--- resource's Lua state, so `Lang:replace(phrases)` here would
--- always replace qb-core's Lang, never the caller's. Consumers
--- must call `LoadLocalePhrases` (which returns a phrases table
--- across the export boundary as plain data) and run
--- `Lang:replace(phrases)` themselves inside their own resource.
local function applyLocaleToSelf(code)
    local phrases = loadLocalePhrases(GetCurrentResourceName(), code)
    if not phrases then return false end
    if not Lang or type(Lang.replace) ~= 'function' then return false end
    Lang:replace(phrases)
    return true
end

exports('GetCurrentLocale', GetCurrentLocale)
exports('GetLocaleManifest', GetLocaleManifest)
exports('LoadLocalePhrases', loadLocalePhrases)

-- The server pushes the player's resolved locale on join (after
-- EnsurePlayerLocale fires from the PlayerLoaded handler) and again
-- whenever it changes. Update our cache + apply to qb-core's own
-- Lang so client-side `Lang:t(...)` calls in qb-core consume the
-- new locale immediately.
RegisterNetEvent('QBCore:Locale:Changed', function(code)
    if type(code) ~= 'string' then return end
    currentLocale = code
    -- qb-core's own Lang. Other resources subscribe to the same event
    -- inside their own resource scope to swap their own Lang via
    -- LoadLocalePhrases + Lang:replace().
    pcall(applyLocaleToSelf, code)
end)
