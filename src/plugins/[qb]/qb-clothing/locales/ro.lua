local Translations = {
    store = {
        barber = "Frizerie",
        surgeon = "Chirurg plastic",
        clothing = "Magazin de haine",
        outfitchanger = "Schimbător de ținute"
    },

    outfits = {
        roomOutfits = "Presetări",
        myOutfits = "Ținutele mele",
        character = "Haine",
        accessoires = "Accesorii"
    },

    menu = {
        hair = "Păr",
        character = "Haine",
        accessoires = "Accesorii",
        features = "Caracteristici"
    },

    ui = {
        select = "Selectează",
        delete = "Șterge",
        select_outfit = "Selectează ținuta",
        player_model = "Model jucător",
        model = "Model",
        mother = "Mamă",
        father = "Tată",
        texture = "Textură",
        type = "Tip",
        item = "Element",
        skin_color = "Culoarea pielii",
        parent_mixer = "Mixer părinți",
        shape_mix = "Mix formă",
        skin_mix = "Mix piele",
        arms = "Brațe",
        undershirt = "Maiou/Curele",
        color = "Culoare",
        jacket = "Geci/Topuri",
        vests = "Veste",
        decals = "Decoruri",
        acessory = "Accesorii gât",
        bags = "Genți",
        pants = "Pantaloni",
        shoes = "Pantofi",
        eye_color = "Culoarea ochilor",
        moles = "Alunițe/Pistrui",
        opacity = "Opacitate",
        nose_width = "Lățimea nasului",
        width = "Lățime",
        nose_peak_height = "Înălțimea vârfului nasului",
        height = "Înălțime",
        nose_peak_length = "Lungimea vârfului nasului",
        length = "Lungime",
        nose_bone_height = "Înălțimea osului nasului",
        nose_peak_lowering = "Coborârea vârfului nasului",
        lowering = "Coborâre",
        nose_bone_twist = "Răsucirea osului nasului",
        twist = "Răsucire",
        eyebrow_height = "Înălțimea sprâncenelor",
        eyebrow_depth = "Adâncimea sprâncenelor",
        depth = "Adâncime",
        cheeks_height = "Înălțimea obrajilor",
        cheeks_width = "Lățimea obrajilor",
        cheeks_depth = "Adâncimea obrajilor",
        eyes_opening = "Deschiderea ochilor",
        opening = "Deschidere",
        lips_thickness = "Grosimea buzelor",
        thickness = "Grosime",
        jaw_bone_width = "Lățimea maxilarului",
        jaw_bone_length = "Lungimea maxilarului",
        chin_height = "Înălțimea bărbiei",
        chin_width = "Lățimea bărbiei",
        butt_chin = "Gropiță în bărbie",
        size = "Mărime",
        neck_thickness = "Grosimea gâtului",
        ageing = "Îmbătrânire",
        hair = "Păr",
        eyebrow = "Sprâncene",
        facial_hair = "Păr facial",
        lipstick = "Ruj",
        blush = "Fard",
        makeup = "Machiaj",
        mask = "Măști",
        hat = "Pălării",
        glasses = "Ochelari",
        ear_accessories = "Accesorii pentru urechi",
        watch = "Ceasuri",
        bracelet = "Brățări",
        btn_confirm = "Confirmă",
        btn_cancel = "Anulează",
        btn_saveOutfit = "Salvează ținuta",
        outfit_name = "Numele ținutei",

        -- u-core: chei noi folosite doar de UI-ul React. Traduse pe
        -- limbă deoarece Lang:replace() nu păstrează lanțul de
        -- fallback al Polyglot.
        outfit_name_hint = "Alege un nume sub care să salvezi această ținută.",
        outfit_name_required = "Nume necesar",
        no_room_outfits = "Nicio ținută presetată",
        no_saved_outfits = "Nicio ținută salvată",
        cam_full = "Corp întreg",
        cam_face = "Față",
        cam_torso = "Trunchi",
        cam_legs = "Picioare",
        rotate_left = "Rotire la stânga",
        rotate_right = "Rotire la dreapta"
    },

    notify = {
        error_bracelet = "Nu poți scoate brățara de gleznă ...",
        info_deleteOutfit = "Ai șters ținuta %{outfit}!"
    }
}

if GetConvar('qb_locale', 'en') == 'ro' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
