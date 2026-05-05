local Translations = {
    notifications = {
        ["char_deleted"] = "Personaggio Eliminato!",
        ["deleted_other_char"] = "Hai eliminato con successo il personaggio con Citizen ID: %{citizenid}.",
        ["forgot_citizenid"] = "Hai dimenticato di inserire il Citizen ID!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Elimina il personaggio di un altro giocatore",
        ["citizenid"] = "Citizen ID",
        ["citizenid_help"] = "Il Citizen ID del personaggio che desideri eliminare",

        -- /logout
        ["logout_description"] = "Logout (Admin Only)",

        -- /closeNUI
        ["closeNUI_description"] = "Chiudi NUI"
    },

    misc = {
        ["droppedplayer"] = "Sei stato disconnesso dal Server"
    },

    ui = {
        -- Main
        characters_header = "I miei Personaggi",
        emptyslot = "Slot Vuoto",
        play_button = "Gioca",
        create_button = "Crea Personaggio",
        delete_button = "Elimina Personaggio",

        -- Character Information
        charinfo_header = "Informazioni Personaggio",
        charinfo_description = "Seleziona uno slot per vedere tutte le informazioni sul tuo personaggio.",
        name = "Nome",
        male = "Uomo",
        female = "Donna",
        firstname = "Nome",
        lastname = "Cognome",
        nationality = "Nazionalità",
        gender = "Genere",
        birthdate = "Data di Nascita",
        job = "Lavoro",
        jobgrade = "Grado",
        cash = "Contanti",
        bank = "Banca",
        phonenumber = "Numero di Telefono",
        accountnumber = "IBAN",

        chardel_header = "Registrazione del personaggio",

        -- Delete character
        deletechar_header = "Elimina Personaggio",
        deletechar_description = "Sei sicuro di voler eliminare il tuo personaggio?",

        -- Buttons
        cancel = "Annulla",
        confirm = "Conferma",

        -- Loading Text
        retrieving_playerdata = "Recupero i dati del giocatore",
        validating_playerdata = "Convalida i dati del giocatore",
        retrieving_characters = "Recupero i dati dei personaggi",
        validating_characters = "Convalido i dati dei personaggi",

        -- Notifications
        ran_into_issue = "Abbiamo riscontrato un problema, contatta lo staff",
        profanity = "Sembra che tu stia usando qualche parola non consentita nella creazione del personaggio!",
        forgotten_field = "Tutti i campi devono essere compialti!",

        -- u-core: chiavi usate dall'UI React (validazione + testi
        -- dell'interfaccia). Tradotte per ogni locale perché lo
        -- swap a runtime via Lang:replace() non preserva la catena
        -- di fallback di Polyglot: le chiavi mancanti non
        -- comparirebbero nel payload `translations` inviato all'UI.
        firstname_too_short = "Il nome deve contenere almeno 2 caratteri.",
        firstname_too_long = "Il nome non può superare i 16 caratteri.",
        lastname_too_short = "Il cognome deve contenere almeno 2 caratteri.",
        lastname_too_long = "Il cognome non può superare i 16 caratteri.",
        invalid_date = "Inserisci una data di nascita valida.",
        err_required = "Obbligatorio",
        err_too_short = "Troppo corto",
        err_too_long = "Troppo lungo",
        err_profanity = "Non consentito",
        err_invalid_date = "Data non valida",
        select_character = "Seleziona un personaggio",
        select_character_subtitle = "Scegli uno slot per iniziare o creare una nuova identità.",
        empty_slot = "Slot vuoto",
        new_character = "Nuovo personaggio",
        disconnect = "Disconnetti"
    }
}

if GetConvar('qb_locale', 'en') == 'it' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
