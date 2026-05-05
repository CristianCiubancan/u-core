local Translations = {
    notifications = {
        ["char_deleted"] = "Charakter gelöscht!",
        ["deleted_other_char"] = "Du hast den Charakter mit der Bürger-ID %{citizenid} erfolgreich gelöscht.",
        ["forgot_citizenid"] = "Du hast vergessen, eine Bürger-ID einzugeben!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Löscht den Charakter eines anderen Spielers",
        ["citizenid"] = "Bürger-ID",
        ["citizenid_help"] = "Die Bürger-ID des Charakters, den du löschen möchtest",

        -- /logout
        ["logout_description"] = "Charakter abmelden (nur Admin)",

        -- /closeNUI
        ["closeNUI_description"] = "Multi-NUI schließen"
    },

    misc = {
        ["droppedplayer"] = "Du wurdest von QBCore getrennt"
    },

    ui = {
        -- Main
        characters_header = "Meine Charaktere",
        emptyslot = "Freier Slot",
        play_button = "Spielen",
        create_button = "Charakter erstellen",
        delete_button = "Charakter löschen",

        -- Character Information
        charinfo_header = "Charakterinformationen",
        charinfo_description = "Wähle einen Charakter-Slot, um alle Informationen über deinen Charakter zu sehen.",
        name = "Name",
        male = "Männlich",
        female = "Weiblich",
        firstname = "Vorname",
        lastname = "Nachname",
        nationality = "Nationalität",
        gender = "Geschlecht",
        birthdate = "Geburtsdatum",
        job = "Beruf",
        jobgrade = "Berufsstufe",
        cash = "Bargeld",
        bank = "Bank",
        phonenumber = "Telefonnummer",
        accountnumber = "Kontonummer",

        chardel_header = "Charakterregistrierung",

        -- Delete character
        deletechar_header = "Charakter löschen",
        deletechar_description = "Bist du sicher, dass du deinen Charakter löschen möchtest?",

        -- Buttons
        cancel = "Abbrechen",
        confirm = "Bestätigen",

        -- Loading Text
        retrieving_playerdata = "Spielerdaten werden abgerufen",
        validating_playerdata = "Spielerdaten werden überprüft",
        retrieving_characters = "Charaktere werden abgerufen",
        validating_characters = "Charaktere werden überprüft",

        -- Notifications
        ran_into_issue = "Wir haben ein Problem festgestellt",
        profanity = "Es scheint, als würdest du versuchen, Schimpfwörter oder unangemessene Begriffe in deinem Namen oder deiner Nationalität zu verwenden!",
        forgotten_field = "Es scheint, als hättest du eines oder mehrere Felder vergessen auszufüllen!",

        -- u-core: Schlüssel für das React-UI (Validierungstexte und
        -- Shell-Beschriftungen). Pro Sprache übersetzt, weil das
        -- Laufzeit-Swap via Lang:replace() die Polyglot-Fallback-Kette
        -- nicht erhält — fehlende Schlüssel würden im
        -- `translations`-Payload für das React-UI fehlen.
        firstname_too_short = "Vorname muss mindestens 2 Zeichen lang sein.",
        firstname_too_long = "Vorname darf 16 Zeichen nicht überschreiten.",
        lastname_too_short = "Nachname muss mindestens 2 Zeichen lang sein.",
        lastname_too_long = "Nachname darf 16 Zeichen nicht überschreiten.",
        invalid_date = "Bitte ein gültiges Geburtsdatum eingeben.",
        err_required = "Erforderlich",
        err_too_short = "Zu kurz",
        err_too_long = "Zu lang",
        err_profanity = "Nicht erlaubt",
        err_invalid_date = "Ungültiges Datum",
        select_character = "Charakter auswählen",
        select_character_subtitle = "Wähle einen Slot, um zu beginnen oder eine neue Identität zu erstellen.",
        empty_slot = "Leerer Platz",
        new_character = "Neuer Charakter",
        disconnect = "Trennen"
    }
}


if GetConvar('qb_locale', 'en') == 'de' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
