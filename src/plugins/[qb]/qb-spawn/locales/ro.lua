local Translations = {
    ui = {
        last_location = "Ultima locație",
        confirm = "Confirmă",
        back = "Înapoi",
        where_would_you_like_to_start = "De unde ai vrea să începi?",
    }
}

if GetConvar('qb_locale', 'en') == 'ro' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
