local Translations = {
    notifications = {
        ["char_deleted"] = "Character deleted!",
        ["deleted_other_char"] = "You successfully deleted the character with citizen id %{citizenid}.",
        ["forgot_citizenid"] = "You forgot to input a citizen id!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Deletes another players character",
        ["citizenid"] = "Citizen ID",
        ["citizenid_help"] = "The Citizen ID of the character you want to delete",

        -- /logout
        ["logout_description"] = "Logout of Character (Admin Only)",

        -- /closeNUI
        ["closeNUI_description"] = "Close Multi NUI"
    },

    misc = {
        ["droppedplayer"] = "You have disconnected from QBCore"
    },

    ui = {
        -- Main
        characters_header = "My Characters",
        emptyslot = "Empty Slot",
        play_button = "Play",
        create_button = "Create Character",
        delete_button = "Delete Character",

        -- Character Information
        charinfo_header = "Character Information",
        charinfo_description = "Select a character slot to see all information about your character.",
        name = "Name",
        male = "Male",
        female = "Female",
        firstname = "First Name",
        lastname = "Last Name",
        nationality = "Nationality",
        gender = "Gender",
        birthdate = "Birthdate",
        job = "Job",
        jobgrade = "Job Grade",
        cash = "Cash",
        bank = "Bank",
        phonenumber = "Phone Number",
        accountnumber = "Account Number",

        chardel_header = "Character Registration",

        -- Delete character
        deletechar_header = "Delete Character",
        deletechar_description = "Are You Sure You Want To Delete Your Character?",

        -- Buttons
        cancel = "Cancel",
        confirm = "Confirm",

        -- Loading Text
        retrieving_playerdata = "Retrieving player data",
        validating_playerdata = "Validating player data",
        retrieving_characters = "Retrieving characters",
        validating_characters = "Validating characters",

        -- Notifications
        ran_into_issue = "We ran into an issue",
        profanity = "It seems like you are trying to use some type of profanity / bad words in your name or nationality!",
        forgotten_field = "It seems like you have forgotten to input one or multiple of the fields!",

        -- u-core: keys consumed by the React webview only. Upstream Vue
        -- carried equivalents in translations.js fallbacks (never in
        -- en.lua). Adding them here lets `Lang:t('ui.<key>')` flow
        -- through the SendNUIMessage('ui').translations payload to the
        -- React tx() helper. Mirrored across all 14 other locale files
        -- under matching `-- u-core:` blocks — runtime Lang:replace()
        -- swaps don't preserve Polyglot's fallback chain, so each
        -- locale must carry its own translations or those keys would
        -- silently drop from the payload.
        firstname_too_short = "First name must be at least 2 characters long.",
        firstname_too_long = "First name cannot exceed 16 characters.",
        lastname_too_short = "Last name must be at least 2 characters long.",
        lastname_too_long = "Last name cannot exceed 16 characters.",
        invalid_date = "Please enter a valid date of birth.",

        -- u-core: short captions for per-field error pills (uppercase tracked).
        err_required = "Required",
        err_too_short = "Too short",
        err_too_long = "Too long",
        err_profanity = "Not allowed",
        err_invalid_date = "Invalid date",

        -- u-core: copy that lives in the React shell, not on the upstream Vue.
        select_character = "Select a character",
        select_character_subtitle = "Choose a slot to begin or create a new identity.",
        empty_slot = "Empty slot",
        new_character = "New character",
        disconnect = "Disconnect",

        -- u-core: shown inside the nationality dropdown while the country
        -- list is still in flight from the server.
        loading_countries = "Loading countries",

        -- u-core: nationality combobox search input + empty result.
        search_nationality = "Search nationality",
        no_matches = "No matches"
    }
}

Lang = Lang or Locale:new({
    phrases = Translations,
    warnOnMissing = true
})
