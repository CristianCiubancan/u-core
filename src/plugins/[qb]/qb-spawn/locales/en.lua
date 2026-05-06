local Translations = {
    ui = {
        last_location = "Last Location",
        confirm = "Confirm",
        back = "Back",
        where_would_you_like_to_start = "Where would you like to start?",
    }
}

Lang = Lang or Locale:new({
    phrases = Translations,
    warnOnMissing = true
})
