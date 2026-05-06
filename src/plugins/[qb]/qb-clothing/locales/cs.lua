local Translations = {
    store = {
        barber = "Holičství",
        surgeon = "Plastický chirurg",
        clothing = "Obchod s oblečením",
        outfitchanger = "Měnič outfitu"
    },

    outfits = {
        roomOutfits = "Předvolby",
        myOutfits = "Moje outfity",
        character = "Oblečení",
        accessoires = "Doplňky"
    },

    menu = {
        hair = "Vlasy",
        character = "Oblečení",
        accessoires = "Doplňky",
        features = "Vzhled"
    },

    ui = {
        select = "Vybrat",
        delete = "Smazat",
        select_outfit = "Vybrat outfit",
        player_model = "Model postavy",
        model = "Model",
        mother = "Matka",
        father = "Otec",
        texture = "Textura",
        type = "Typ",
        item = "Položka",
        skin_color = "Barva pleti",
        parent_mixer = "Mixér rodičů",
        shape_mix = "Mix tvaru",
        skin_mix = "Mix pleti",
        arms = "Paže",
        undershirt = "Tričko/Pásky",
        color = "Barva",
        jacket = "Bundy/Vrchní díl",
        vests = "Vesty",
        decals = "Potisky",
        acessory = "Doplňky na krk",
        bags = "Tašky",
        pants = "Kalhoty",
        shoes = "Boty",
        eye_color = "Barva očí",
        moles = "Mateřská znaménka/Pihy",
        opacity = "Průhlednost",
        nose_width = "Šířka nosu",
        width = "Šířka",
        nose_peak_height = "Výška špičky nosu",
        height = "Výška",
        nose_peak_length = "Délka špičky nosu",
        length = "Délka",
        nose_bone_height = "Výška nosní kosti",
        nose_peak_lowering = "Snížení špičky nosu",
        lowering = "Snížení",
        nose_bone_twist = "Zkroucení nosní kosti",
        twist = "Zkroucení",
        eyebrow_height = "Výška obočí",
        eyebrow_depth = "Hloubka obočí",
        depth = "Hloubka",
        cheeks_height = "Výška tváří",
        cheeks_width = "Šířka tváří",
        cheeks_depth = "Hloubka tváří",
        eyes_opening = "Otevření očí",
        opening = "Otevření",
        lips_thickness = "Tloušťka rtů",
        thickness = "Tloušťka",
        jaw_bone_width = "Šířka čelisti",
        jaw_bone_length = "Délka čelisti",
        chin_height = "Výška brady",
        chin_width = "Šířka brady",
        butt_chin = "Důlek na bradě",
        size = "Velikost",
        neck_thickness = "Tloušťka krku",
        ageing = "Stárnutí",
        hair = "Vlasy",
        eyebrow = "Obočí",
        facial_hair = "Vousy",
        lipstick = "Rtěnka",
        blush = "Tvářenka",
        makeup = "Make-up",
        mask = "Masky",
        hat = "Klobouky",
        glasses = "Brýle",
        ear_accessories = "Doplňky na uši",
        watch = "Hodinky",
        bracelet = "Náramky",
        btn_confirm = "Potvrdit",
        btn_cancel = "Zrušit",
        btn_saveOutfit = "Uložit outfit",
        outfit_name = "Název outfitu",

        -- u-core: nové klíče používané pouze React UI. Přeloženy pro
        -- každý jazyk, protože Lang:replace() nezachovává Polyglot
        -- fallback řetězec.
        outfit_name_hint = "Vyber jméno, pod kterým tento outfit uložit.",
        outfit_name_required = "Jméno vyžadováno",
        no_room_outfits = "Žádné předvolené outfity",
        no_saved_outfits = "Žádné uložené outfity",
        cam_full = "Celá postava",
        cam_face = "Obličej",
        cam_torso = "Trup",
        cam_legs = "Nohy",
        rotate_left = "Otočit doleva",
        rotate_right = "Otočit doprava"
    },

    notify = {
        error_bracelet = "Nemůžeš si sundat náramek z kotníku ...",
        info_deleteOutfit = "Smazal jsi svůj outfit %{outfit}!"
    }
}

if GetConvar('qb_locale', 'en') == 'cs' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
