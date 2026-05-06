local Translations = {
    store = {
        barber = "Friseur",
        surgeon = "Schönheitschirurg",
        clothing = "Kleidergeschäft",
        outfitchanger = "Outfit-Wechsler"
    },

    outfits = {
        roomOutfits = "Vorlagen",
        myOutfits = "Meine Outfits",
        character = "Kleidung",
        accessoires = "Accessoires"
    },

    menu = {
        hair = "Haare",
        character = "Kleidung",
        accessoires = "Accessoires",
        features = "Merkmale"
    },

    ui = {
        select = "Auswählen",
        delete = "Löschen",
        select_outfit = "Outfit auswählen",
        player_model = "Spielermodell",
        model = "Modell",
        mother = "Mutter",
        father = "Vater",
        texture = "Textur",
        type = "Typ",
        item = "Element",
        skin_color = "Hautfarbe",
        parent_mixer = "Eltern-Mixer",
        shape_mix = "Formmischung",
        skin_mix = "Hautmischung",
        arms = "Arme",
        undershirt = "Unterhemd/Gürtel",
        color = "Farbe",
        jacket = "Jacken/Oberteile",
        vests = "Westen",
        decals = "Aufkleber",
        acessory = "Hals-Accessoires",
        bags = "Taschen",
        pants = "Hosen",
        shoes = "Schuhe",
        eye_color = "Augenfarbe",
        moles = "Muttermale/Sommersprossen",
        opacity = "Deckkraft",
        nose_width = "Nasenbreite",
        width = "Breite",
        nose_peak_height = "Nasenspitzenhöhe",
        height = "Höhe",
        nose_peak_length = "Nasenspitzenlänge",
        length = "Länge",
        nose_bone_height = "Nasenbeinhöhe",
        nose_peak_lowering = "Nasenspitzensenkung",
        lowering = "Senkung",
        nose_bone_twist = "Nasenbeintorsion",
        twist = "Torsion",
        eyebrow_height = "Augenbrauenhöhe",
        eyebrow_depth = "Augenbrauentiefe",
        depth = "Tiefe",
        cheeks_height = "Wangenhöhe",
        cheeks_width = "Wangenbreite",
        cheeks_depth = "Wangentiefe",
        eyes_opening = "Augenöffnung",
        opening = "Öffnung",
        lips_thickness = "Lippendicke",
        thickness = "Dicke",
        jaw_bone_width = "Kieferbreite",
        jaw_bone_length = "Kieferlänge",
        chin_height = "Kinnbeinhöhe",
        chin_width = "Kinnbeinbreite",
        butt_chin = "Kinngrübchen",
        size = "Größe",
        neck_thickness = "Halsdicke",
        ageing = "Alterung",
        hair = "Haare",
        eyebrow = "Augenbrauen",
        facial_hair = "Gesichtsbehaarung",
        lipstick = "Lippenstift",
        blush = "Rouge",
        makeup = "Make-up",
        mask = "Masken",
        hat = "Hüte",
        glasses = "Brillen",
        ear_accessories = "Ohr-Accessoires",
        watch = "Uhren",
        bracelet = "Armbänder",
        btn_confirm = "Bestätigen",
        btn_cancel = "Abbrechen",
        btn_saveOutfit = "Outfit speichern",
        outfit_name = "Outfit-Name",

        -- u-core: neue Schlüssel ausschließlich für die React-UI. Pro
        -- Sprache übersetzt, weil Lang:replace() die Polyglot-
        -- Fallback-Kette nicht erhält.
        outfit_name_hint = "Wähle einen Namen, unter dem dieses Outfit gespeichert wird.",
        outfit_name_required = "Name erforderlich",
        no_room_outfits = "Keine Vorlagen verfügbar",
        no_saved_outfits = "Keine gespeicherten Outfits",
        cam_full = "Ganzkörper",
        cam_face = "Gesicht",
        cam_torso = "Oberkörper",
        cam_legs = "Beine",
        rotate_left = "Nach links drehen",
        rotate_right = "Nach rechts drehen"
    },

    notify = {
        error_bracelet = "Du kannst deine Fußfessel nicht entfernen ...",
        info_deleteOutfit = "Du hast dein Outfit %{outfit} gelöscht!"
    }
}

if GetConvar('qb_locale', 'en') == 'de' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
