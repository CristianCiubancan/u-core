local Translations = {
    notifications = {
        ["char_deleted"] = "Hahmo poistettu!",
        ["deleted_other_char"] = "Sinä olet poistanut hahmon kansalaistunnuksella %{citizenid}.",
        ["forgot_citizenid"] = "Sinä unohdit lisätä kansalaistunnuksen!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Poistaa toisen pelaajan hahmon",
        ["citizenid"] = "Kansalaisuustunnus",
        ["citizenid_help"] = "Poistettavan hahmon kansalaisuustunnus",

        -- /logout
        ["logout_description"] = "Kirjaudu ulos hahmolta (Vain Valvoja)",

        -- /closeNUI
        ["closeNUI_description"] = "Sammuta Multi NUI"
    },

    misc = {
        ["droppedplayer"] = "Sinä olet lähtenyt ColdDryRP:ltä"
    },

    ui = {
        -- Main
        characters_header = "Minun hahmot",
        emptyslot = "Tyhjä tila",
        play_button = "Pelaa",
        create_button = "Luo hahmo",
        delete_button = "Poista hamho",

        -- Character Information
        charinfo_header = "Hahmon tiedot",
        charinfo_description = "Valitse hahmot jotta näät siitä tiedot.",
        name = "Nimi",
        male = "Mies",
        female = "Nainen",
        firstname = "Etunimi",
        lastname = "Sukunimi",
        nationality = "Kansalaisuus",
        gender = "Sukupuoli",
        birthdate = "Syntymäpäivä",
        job = "Työ",
        jobgrade = "Työn arvo",
        cash = "Käteinen",
        bank = "Pankki",
        phonenumber = "Puhelin numero",
        accountnumber = "Tilin numero",

        chardel_header = "Hahmon luonti",

        -- Delete character
        deletechar_header = "Hahmon poisto",
        deletechar_description = "Haluatko varmasti poistaa hahmon?",

        -- Buttons
        cancel = "Peruuta",
        confirm = "Vahvista",

        -- Loading Text
        retrieving_playerdata = "Haetaan pelaajatietoja",
        validating_playerdata = "Vahvistetaan pelaajatietoja",
        retrieving_characters = "Haetaan hahmoja",
        validating_characters = "Vahvistetaan hahmoja",

        -- Notifications
        ran_into_issue = "Törmäsimme ongelmaan",
        profanity = "Vaikuttaa siltä, että yrität käyttää jonkinlaista kiroilua/pahoja sanoja nimessäsi tai kansallisuudessasi!",
        forgotten_field = "Näyttää siltä, että olet unohtanut syöttää yhden tai useita kenttiä!",

        -- u-core: avaimet, joita React-käyttöliittymä käyttää (kenttien
        -- vahvistus + käyttöliittymän tekstit). Käännetty jokaiselle
        -- kielelle erikseen, koska ajonaikainen vaihto Lang:replace()
        -- -funktiolla ei säilytä Polyglotin fallback-ketjua —
        -- puuttuvat avaimet eivät ilmestyisi `translations`-payloadiin.
        firstname_too_short = "Etunimen tulee olla vähintään 2 merkkiä pitkä.",
        firstname_too_long = "Etunimi ei voi olla yli 16 merkkiä pitkä.",
        lastname_too_short = "Sukunimen tulee olla vähintään 2 merkkiä pitkä.",
        lastname_too_long = "Sukunimi ei voi olla yli 16 merkkiä pitkä.",
        invalid_date = "Anna kelvollinen syntymäaika.",
        err_required = "Pakollinen",
        err_too_short = "Liian lyhyt",
        err_too_long = "Liian pitkä",
        err_profanity = "Ei sallittu",
        err_invalid_date = "Virheellinen päivämäärä",
        select_character = "Valitse hahmo",
        select_character_subtitle = "Valitse paikka aloittaaksesi tai luo uusi henkilöllisyys.",
        empty_slot = "Tyhjä paikka",
        new_character = "Uusi hahmo",
        disconnect = "Katkaise yhteys"
    }
}

if GetConvar('qb_locale', 'en') == 'fi' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
