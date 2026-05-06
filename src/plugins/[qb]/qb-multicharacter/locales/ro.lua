local Translations = {
    notifications = {
        ["char_deleted"] = "Personajul a fost șters!",
        ["deleted_other_char"] = "Ai șters personajul cu ID-ul cetățean %{citizenid}.",
        ["forgot_citizenid"] = "Ai uitat să introduci un ID cetățean!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Șterge personajul altui jucător",
        ["citizenid"] = "ID cetățean",
        ["citizenid_help"] = "ID-ul cetățean al personajului pe care vrei să îl ștergi",

        -- /logout
        ["logout_description"] = "Deconectare de la personaj (doar admin)",

        -- /closeNUI
        ["closeNUI_description"] = "Închide UI-ul Multi"
    },

    misc = {
        ["droppedplayer"] = "Te-ai deconectat de la QBCore"
    },

    ui = {
        -- Main
        characters_header = "Personajele mele",
        emptyslot = "Slot gol",
        play_button = "Joacă",
        create_button = "Creează personaj",
        delete_button = "Șterge personaj",

        -- Character Information
        charinfo_header = "Informații personaj",
        charinfo_description = "Selectează un slot pentru a vedea toate informațiile despre personaj.",
        name = "Nume",
        male = "Bărbat",
        female = "Femeie",
        firstname = "Prenume",
        lastname = "Nume",
        nationality = "Naționalitate",
        gender = "Gen",
        birthdate = "Data nașterii",
        job = "Job",
        jobgrade = "Grad",
        cash = "Cash",
        bank = "Bancă",
        phonenumber = "Număr de telefon",
        accountnumber = "Număr de cont",

        chardel_header = "Înregistrare personaj",

        -- Delete character
        deletechar_header = "Șterge personajul",
        deletechar_description = "Ești sigur că vrei să ștergi acest personaj?",

        -- Buttons
        cancel = "Anulează",
        confirm = "Confirmă",

        -- Loading Text
        retrieving_playerdata = "Se încarcă datele jucătorului",
        validating_playerdata = "Se validează datele jucătorului",
        retrieving_characters = "Se încarcă personajele",
        validating_characters = "Se validează personajele",

        -- Notifications
        ran_into_issue = "Am întâmpinat o problemă",
        profanity = "Se pare că încerci să folosești cuvinte nepotrivite în nume sau naționalitate!",
        forgotten_field = "Se pare că ai uitat să completezi unul sau mai multe câmpuri!",

        -- u-core: chei consumate exclusiv de UI-ul React (validare +
        -- texte ale interfeței). Traduse pentru fiecare locale pentru
        -- că schimbarea limbii la runtime via Lang:replace() nu
        -- păstrează lanțul de fallback Polyglot — cheile lipsă nu ar
        -- ajunge în payload-ul `translations` trimis către UI.
        firstname_too_short = "Prenumele trebuie să aibă cel puțin 2 caractere.",
        firstname_too_long = "Prenumele nu poate depăși 16 caractere.",
        lastname_too_short = "Numele trebuie să aibă cel puțin 2 caractere.",
        lastname_too_long = "Numele nu poate depăși 16 caractere.",
        invalid_date = "Te rog introdu o dată de naștere validă.",
        err_required = "Obligatoriu",
        err_too_short = "Prea scurt",
        err_too_long = "Prea lung",
        err_profanity = "Nepermis",
        err_invalid_date = "Dată invalidă",
        select_character = "Alege un personaj",
        select_character_subtitle = "Alege un slot pentru a începe sau pentru a crea o nouă identitate.",
        empty_slot = "Slot gol",
        new_character = "Personaj nou",
        disconnect = "Deconectare",
        loading_countries = "Se încarcă țările",
        search_nationality = "Caută naționalitate",
        no_matches = "Nicio potrivire"
    }
}

if GetConvar('qb_locale', 'en') == 'ro' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
