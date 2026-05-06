local Translations = {
    store = {
        barber = "Parturi",
        surgeon = "Plastiikkakirurgi",
        clothing = "Vaatekauppa",
        outfitchanger = "Asunvaihto"
    },

    outfits = {
        roomOutfits = "Esiasetukset",
        myOutfits = "Omat asut",
        character = "Vaatteet",
        accessoires = "Asusteet"
    },

    menu = {
        hair = "Hiukset",
        character = "Vaatteet",
        accessoires = "Asusteet",
        features = "Ominaisuudet"
    },

    ui = {
        select = "Valitse",
        delete = "Poista",
        select_outfit = "Valitse asu",
        player_model = "Pelaajamalli",
        model = "Malli",
        mother = "Äiti",
        father = "Isä",
        texture = "Tekstuuri",
        type = "Tyyppi",
        item = "Esine",
        skin_color = "Ihonväri",
        parent_mixer = "Vanhempi-yhdistäjä",
        shape_mix = "Muodon yhdistys",
        skin_mix = "Ihon yhdistys",
        arms = "Kädet",
        undershirt = "Aluspaita/Vyöt",
        color = "Väri",
        jacket = "Takit/Paidat",
        vests = "Liivit",
        decals = "Kuviot",
        acessory = "Kaulan asusteet",
        bags = "Laukut",
        pants = "Housut",
        shoes = "Kengät",
        eye_color = "Silmien väri",
        moles = "Luomet/Pisamat",
        opacity = "Läpinäkyvyys",
        nose_width = "Nenän leveys",
        width = "Leveys",
        nose_peak_height = "Nenän kärjen korkeus",
        height = "Korkeus",
        nose_peak_length = "Nenän kärjen pituus",
        length = "Pituus",
        nose_bone_height = "Nenäluun korkeus",
        nose_peak_lowering = "Nenän kärjen lasku",
        lowering = "Lasku",
        nose_bone_twist = "Nenäluun kierre",
        twist = "Kierre",
        eyebrow_height = "Kulmakarvojen korkeus",
        eyebrow_depth = "Kulmakarvojen syvyys",
        depth = "Syvyys",
        cheeks_height = "Poskien korkeus",
        cheeks_width = "Poskien leveys",
        cheeks_depth = "Poskien syvyys",
        eyes_opening = "Silmien aukko",
        opening = "Aukko",
        lips_thickness = "Huulien paksuus",
        thickness = "Paksuus",
        jaw_bone_width = "Leukaluun leveys",
        jaw_bone_length = "Leukaluun pituus",
        chin_height = "Leuan korkeus",
        chin_width = "Leuan leveys",
        butt_chin = "Hymykuoppa leuassa",
        size = "Koko",
        neck_thickness = "Niskan paksuus",
        ageing = "Ikääntyminen",
        hair = "Hiukset",
        eyebrow = "Kulmakarvat",
        facial_hair = "Kasvojen karvat",
        lipstick = "Huulipuna",
        blush = "Poskipuna",
        makeup = "Meikki",
        mask = "Maskit",
        hat = "Hatut",
        glasses = "Lasit",
        ear_accessories = "Korva-asusteet",
        watch = "Kellot",
        bracelet = "Rannekkeet",
        btn_confirm = "Vahvista",
        btn_cancel = "Peruuta",
        btn_saveOutfit = "Tallenna asu",
        outfit_name = "Asun nimi",

        -- u-core: vain React-käyttöliittymän käyttämät uudet avaimet.
        -- Käännetty kielikohtaisesti, koska Lang:replace() ei säilytä
        -- Polyglotin fallback-ketjua.
        outfit_name_hint = "Valitse nimi, jolla tallennat tämän asun.",
        outfit_name_required = "Nimi vaaditaan",
        no_room_outfits = "Ei esiasetettuja asuja",
        no_saved_outfits = "Ei tallennettuja asuja",
        cam_full = "Koko vartalo",
        cam_face = "Kasvot",
        cam_torso = "Vartalo",
        cam_legs = "Jalat",
        rotate_left = "Pyöritä vasemmalle",
        rotate_right = "Pyöritä oikealle"
    },

    notify = {
        error_bracelet = "Et voi poistaa nilkkaranneketta ...",
        info_deleteOutfit = "Olet poistanut asun %{outfit}!"
    }
}

if GetConvar('qb_locale', 'en') == 'fi' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
