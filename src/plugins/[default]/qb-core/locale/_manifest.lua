-- u-core: locale manifest. Lists the locales we treat as "available" for
-- the per-player locale picker. Codes intentionally narrower than the
-- raw `locale/*.lua` set on disk — listing every code we have a file for
-- (~40) drowns the picker; this trims to widely-spoken languages with
-- maintained translations across the qb-* stack we ship. Keys are the
-- locale code (matches the filename minus .lua); values are the language
-- name in its own language so a non-English speaker can recognize it.
--
-- Ordered alphabetically by code so the picker is stable.
QBCoreLocaleManifest = {
    { code = 'ar',    name = 'العربية' },
    { code = 'cs',    name = 'Čeština' },
    { code = 'de',    name = 'Deutsch' },
    { code = 'en',    name = 'English' },
    { code = 'es',    name = 'Español' },
    { code = 'fi',    name = 'Suomi' },
    { code = 'fr',    name = 'Français' },
    { code = 'it',    name = 'Italiano' },
    { code = 'ja',    name = '日本語' },
    { code = 'nl',    name = 'Nederlands' },
    { code = 'pt',    name = 'Português' },
    { code = 'pt-br', name = 'Português (BR)' },
    { code = 'ro',    name = 'Română' },
    { code = 'sv',    name = 'Svenska' },
    { code = 'tr',    name = 'Türkçe' },
    { code = 'vi',    name = 'Tiếng Việt' },
}

QBCoreLocaleDefault = 'en'

-- Quick lookup: code → boolean. Cheap reject for unknown codes from
-- the wire (NUI submissions, /locale chat command, etc.).
QBCoreLocaleAllowed = {}
for _, entry in ipairs(QBCoreLocaleManifest) do
    QBCoreLocaleAllowed[entry.code] = true
end
