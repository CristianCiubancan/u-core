local Translations = {
    store = {
        barber = "Barbearia",
        surgeon = "Cirurgião plástico",
        clothing = "Loja de roupa",
        outfitchanger = "Trocador de outfit"
    },

    outfits = {
        roomOutfits = "Predefinições",
        myOutfits = "As minhas outfits",
        character = "Roupa",
        accessoires = "Acessórios"
    },

    menu = {
        hair = "Cabelo",
        character = "Roupa",
        accessoires = "Acessórios",
        features = "Características"
    },

    ui = {
        select = "Selecionar",
        delete = "Apagar",
        select_outfit = "Selecionar outfit",
        player_model = "Modelo do jogador",
        model = "Modelo",
        mother = "Mãe",
        father = "Pai",
        texture = "Textura",
        type = "Tipo",
        item = "Item",
        skin_color = "Cor da pele",
        parent_mixer = "Mistura dos pais",
        shape_mix = "Mistura de forma",
        skin_mix = "Mistura de pele",
        arms = "Braços",
        undershirt = "Camisola interior/Cintos",
        color = "Cor",
        jacket = "Casacos/Tops",
        vests = "Coletes",
        decals = "Decalques",
        acessory = "Acessórios de pescoço",
        bags = "Mochilas",
        pants = "Calças",
        shoes = "Sapatos",
        eye_color = "Cor dos olhos",
        moles = "Sinais/Sardas",
        opacity = "Opacidade",
        nose_width = "Largura do nariz",
        width = "Largura",
        nose_peak_height = "Altura da ponta do nariz",
        height = "Altura",
        nose_peak_length = "Comprimento da ponta do nariz",
        length = "Comprimento",
        nose_bone_height = "Altura do osso do nariz",
        nose_peak_lowering = "Descida da ponta do nariz",
        lowering = "Descida",
        nose_bone_twist = "Torção do osso do nariz",
        twist = "Torção",
        eyebrow_height = "Altura das sobrancelhas",
        eyebrow_depth = "Profundidade das sobrancelhas",
        depth = "Profundidade",
        cheeks_height = "Altura das bochechas",
        cheeks_width = "Largura das bochechas",
        cheeks_depth = "Profundidade das bochechas",
        eyes_opening = "Abertura dos olhos",
        opening = "Abertura",
        lips_thickness = "Espessura dos lábios",
        thickness = "Espessura",
        jaw_bone_width = "Largura do maxilar",
        jaw_bone_length = "Comprimento do maxilar",
        chin_height = "Altura do queixo",
        chin_width = "Largura do queixo",
        butt_chin = "Covinha no queixo",
        size = "Tamanho",
        neck_thickness = "Espessura do pescoço",
        ageing = "Envelhecimento",
        hair = "Cabelo",
        eyebrow = "Sobrancelhas",
        facial_hair = "Pelo facial",
        lipstick = "Batom",
        blush = "Blush",
        makeup = "Maquilhagem",
        mask = "Máscaras",
        hat = "Chapéus",
        glasses = "Óculos",
        ear_accessories = "Acessórios de orelha",
        watch = "Relógios",
        bracelet = "Pulseiras",
        btn_confirm = "Confirmar",
        btn_cancel = "Cancelar",
        btn_saveOutfit = "Guardar outfit",
        outfit_name = "Nome do outfit",

        -- u-core: novas chaves usadas apenas pela UI React. Traduzidas
        -- por idioma porque Lang:replace() não preserva a cadeia de
        -- fallback do Polyglot.
        outfit_name_hint = "Escolhe um nome para guardar esta outfit.",
        outfit_name_required = "Nome obrigatório",
        no_room_outfits = "Sem outfits predefinidas",
        no_saved_outfits = "Sem outfits guardadas",
        cam_full = "Corpo inteiro",
        cam_face = "Rosto",
        cam_torso = "Tronco",
        cam_legs = "Pernas",
        rotate_left = "Rodar para a esquerda",
        rotate_right = "Rodar para a direita"
    },

    notify = {
        error_bracelet = "Não podes remover a tua pulseira de tornozelo ...",
        info_deleteOutfit = "Apagaste a tua outfit %{outfit}!"
    }
}

if GetConvar('qb_locale', 'en') == 'pt' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
