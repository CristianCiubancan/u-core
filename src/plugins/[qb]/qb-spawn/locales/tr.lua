local Translations = {
    ui = {
        last_location = "Son Konum",
        confirm = "Onayla",
        back = "Geri",
        where_would_you_like_to_start = "Nereden başlamak istersiniz?",
    }
}

if GetConvar('qb_locale', 'en') == 'tr' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
