local Translations = {
    ui = {
        last_location = "Última localização",
        confirm = "Confirmar",
        back = "Voltar",
        where_would_you_like_to_start = "Onde gostaria de começar?",
    }
}

if GetConvar('qb_locale', 'en') == 'pt' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
