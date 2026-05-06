local Translations = {
    ui = {
        last_location = "Senaste plats",
        confirm = "Bekräfta",
        back = "Tillbaka",
        where_would_you_like_to_start = "Var skulle du vilja börja?",
    }
}

if GetConvar('qb_locale', 'en') == 'sv' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
