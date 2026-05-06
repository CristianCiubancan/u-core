local Translations = {
    ui = {
        last_location = "Viimeisin sijainti",
        confirm = "Vahvista",
        back = "Takaisin",
        where_would_you_like_to_start = "Mistä haluaisit aloittaa?",
    }
}

if GetConvar('qb_locale', 'en') == 'fi' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
