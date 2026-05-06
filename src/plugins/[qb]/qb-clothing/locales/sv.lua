local Translations = {
    store = {
        barber = "Frisör",
        surgeon = "Plastikkirurg",
        clothing = "Klädaffär",
        outfitchanger = "Klädbytare"
    },

    outfits = {
        roomOutfits = "Förinställningar",
        myOutfits = "Mina outfits",
        character = "Kläder",
        accessoires = "Tillbehör"
    },

    menu = {
        hair = "Hår",
        character = "Kläder",
        accessoires = "Tillbehör",
        features = "Egenskaper"
    },

    ui = {
        select = "Välj",
        delete = "Ta bort",
        select_outfit = "Välj outfit",
        player_model = "Spelarmodell",
        model = "Modell",
        mother = "Mor",
        father = "Far",
        texture = "Textur",
        type = "Typ",
        item = "Föremål",
        skin_color = "Hudfärg",
        parent_mixer = "Föräldramix",
        shape_mix = "Formmix",
        skin_mix = "Hudmix",
        arms = "Armar",
        undershirt = "Undertröja/Bälten",
        color = "Färg",
        jacket = "Jackor/Toppar",
        vests = "Västar",
        decals = "Dekaler",
        acessory = "Halsaccessoarer",
        bags = "Väskor",
        pants = "Byxor",
        shoes = "Skor",
        eye_color = "Ögonfärg",
        moles = "Födelsemärken/Fräknar",
        opacity = "Opacitet",
        nose_width = "Näsbredd",
        width = "Bredd",
        nose_peak_height = "Näsryggens höjd",
        height = "Höjd",
        nose_peak_length = "Näsryggens längd",
        length = "Längd",
        nose_bone_height = "Näsbenets höjd",
        nose_peak_lowering = "Näsryggens sänkning",
        lowering = "Sänkning",
        nose_bone_twist = "Näsbenets vridning",
        twist = "Vridning",
        eyebrow_height = "Ögonbrynens höjd",
        eyebrow_depth = "Ögonbrynens djup",
        depth = "Djup",
        cheeks_height = "Kindernas höjd",
        cheeks_width = "Kindernas bredd",
        cheeks_depth = "Kindernas djup",
        eyes_opening = "Ögonöppning",
        opening = "Öppning",
        lips_thickness = "Läpparnas tjocklek",
        thickness = "Tjocklek",
        jaw_bone_width = "Käkbenets bredd",
        jaw_bone_length = "Käkbenets längd",
        chin_height = "Hakans höjd",
        chin_width = "Hakans bredd",
        butt_chin = "Hakgrop",
        size = "Storlek",
        neck_thickness = "Halsens tjocklek",
        ageing = "Åldring",
        hair = "Hår",
        eyebrow = "Ögonbryn",
        facial_hair = "Ansiktshår",
        lipstick = "Läppstift",
        blush = "Rouge",
        makeup = "Smink",
        mask = "Masker",
        hat = "Hattar",
        glasses = "Glasögon",
        ear_accessories = "Öronaccessoarer",
        watch = "Klockor",
        bracelet = "Armband",
        btn_confirm = "Bekräfta",
        btn_cancel = "Avbryt",
        btn_saveOutfit = "Spara outfit",
        outfit_name = "Outfitens namn",

        -- u-core: nya nycklar som endast används av React-UI:t.
        -- Översatta per språk eftersom Lang:replace() inte bevarar
        -- Polyglots fallback-kedja.
        outfit_name_hint = "Välj ett namn att spara denna outfit under.",
        outfit_name_required = "Namn krävs",
        no_room_outfits = "Inga förinställda outfits",
        no_saved_outfits = "Inga sparade outfits",
        cam_full = "Helkropp",
        cam_face = "Ansikte",
        cam_torso = "Överkropp",
        cam_legs = "Ben",
        rotate_left = "Rotera vänster",
        rotate_right = "Rotera höger"
    },

    notify = {
        error_bracelet = "Du kan inte ta bort din fotboja ...",
        info_deleteOutfit = "Du har tagit bort din outfit %{outfit}!"
    }
}

if GetConvar('qb_locale', 'en') == 'sv' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
