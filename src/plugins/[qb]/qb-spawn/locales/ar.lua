local Translations = {
    ui = {
        last_location = "آخر موقع",
        confirm = "تأكيد",
        back = "رجوع",
        where_would_you_like_to_start = "من أين تريد أن تبدأ؟",
    }
}

if GetConvar('qb_locale', 'en') == 'ar' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
