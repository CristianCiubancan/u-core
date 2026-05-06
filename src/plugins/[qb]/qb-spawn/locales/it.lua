local Translations = {
    ui = {
        last_location = "Ultima posizione",
        confirm = "Conferma",
        back = "Indietro",
        where_would_you_like_to_start = "Da dove vorresti iniziare?",
    }
}

if GetConvar('qb_locale', 'en') == 'it' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
