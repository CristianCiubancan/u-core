local Translations = {
    ui = {
        last_location = "Vị trí cuối",
        confirm = "Xác nhận",
        back = "Quay lại",
        where_would_you_like_to_start = "Bạn muốn bắt đầu ở đâu?",
    }
}

if GetConvar('qb_locale', 'en') == 'vi' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
