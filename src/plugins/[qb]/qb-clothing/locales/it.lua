local Translations = {
    store = {
        barber = "Barbiere",
        surgeon = "Chirurgo plastico",
        clothing = "Negozio di abbigliamento",
        outfitchanger = "Cambia outfit"
    },

    outfits = {
        roomOutfits = "Preimpostati",
        myOutfits = "I miei outfit",
        character = "Abbigliamento",
        accessoires = "Accessori"
    },

    menu = {
        hair = "Capelli",
        character = "Abbigliamento",
        accessoires = "Accessori",
        features = "Caratteristiche"
    },

    ui = {
        select = "Seleziona",
        delete = "Elimina",
        select_outfit = "Seleziona outfit",
        player_model = "Modello del giocatore",
        model = "Modello",
        mother = "Madre",
        father = "Padre",
        texture = "Texture",
        type = "Tipo",
        item = "Elemento",
        skin_color = "Colore della pelle",
        parent_mixer = "Mixer dei genitori",
        shape_mix = "Mix della forma",
        skin_mix = "Mix della pelle",
        arms = "Braccia",
        undershirt = "Maglietta intima/Cinture",
        color = "Colore",
        jacket = "Giacche/Top",
        vests = "Gilet",
        decals = "Decalcomanie",
        acessory = "Accessori da collo",
        bags = "Borse",
        pants = "Pantaloni",
        shoes = "Scarpe",
        eye_color = "Colore degli occhi",
        moles = "Nei/Lentiggini",
        opacity = "Opacità",
        nose_width = "Larghezza del naso",
        width = "Larghezza",
        nose_peak_height = "Altezza punta del naso",
        height = "Altezza",
        nose_peak_length = "Lunghezza punta del naso",
        length = "Lunghezza",
        nose_bone_height = "Altezza osso del naso",
        nose_peak_lowering = "Abbassamento punta del naso",
        lowering = "Abbassamento",
        nose_bone_twist = "Torsione osso del naso",
        twist = "Torsione",
        eyebrow_height = "Altezza sopracciglia",
        eyebrow_depth = "Profondità sopracciglia",
        depth = "Profondità",
        cheeks_height = "Altezza guance",
        cheeks_width = "Larghezza guance",
        cheeks_depth = "Profondità guance",
        eyes_opening = "Apertura occhi",
        opening = "Apertura",
        lips_thickness = "Spessore labbra",
        thickness = "Spessore",
        jaw_bone_width = "Larghezza mascella",
        jaw_bone_length = "Lunghezza mascella",
        chin_height = "Altezza mento",
        chin_width = "Larghezza mento",
        butt_chin = "Fossetta del mento",
        size = "Dimensione",
        neck_thickness = "Spessore del collo",
        ageing = "Invecchiamento",
        hair = "Capelli",
        eyebrow = "Sopracciglia",
        facial_hair = "Peli del viso",
        lipstick = "Rossetto",
        blush = "Fard",
        makeup = "Trucco",
        mask = "Maschere",
        hat = "Cappelli",
        glasses = "Occhiali",
        ear_accessories = "Accessori per orecchie",
        watch = "Orologi",
        bracelet = "Braccialetti",
        btn_confirm = "Conferma",
        btn_cancel = "Annulla",
        btn_saveOutfit = "Salva outfit",
        outfit_name = "Nome outfit",

        -- u-core: nuove chiavi usate solo dall'UI React. Tradotte per
        -- lingua perché Lang:replace() non preserva la catena di
        -- fallback di Polyglot.
        outfit_name_hint = "Scegli un nome per salvare questo outfit.",
        outfit_name_required = "Nome richiesto",
        no_room_outfits = "Nessun outfit preimpostato",
        no_saved_outfits = "Nessun outfit salvato",
        cam_full = "Corpo intero",
        cam_face = "Viso",
        cam_torso = "Busto",
        cam_legs = "Gambe",
        rotate_left = "Ruota a sinistra",
        rotate_right = "Ruota a destra"
    },

    notify = {
        error_bracelet = "Non puoi rimuovere il tuo braccialetto alla caviglia ...",
        info_deleteOutfit = "Hai eliminato il tuo outfit %{outfit}!"
    }
}

if GetConvar('qb_locale', 'en') == 'it' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
