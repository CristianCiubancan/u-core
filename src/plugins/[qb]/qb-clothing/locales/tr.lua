local Translations = {
    store = {
        barber = "Berber",
        surgeon = "Estetik cerrah",
        clothing = "Giyim mağazası",
        outfitchanger = "Kıyafet değiştirici"
    },

    outfits = {
        roomOutfits = "Hazır kıyafetler",
        myOutfits = "Kıyafetlerim",
        character = "Giyim",
        accessoires = "Aksesuarlar"
    },

    menu = {
        hair = "Saç",
        character = "Giyim",
        accessoires = "Aksesuarlar",
        features = "Özellikler"
    },

    ui = {
        select = "Seç",
        delete = "Sil",
        select_outfit = "Kıyafet seç",
        player_model = "Oyuncu modeli",
        model = "Model",
        mother = "Anne",
        father = "Baba",
        texture = "Doku",
        type = "Tür",
        item = "Öğe",
        skin_color = "Ten rengi",
        parent_mixer = "Ebeveyn karıştırıcı",
        shape_mix = "Şekil karışımı",
        skin_mix = "Ten karışımı",
        arms = "Kollar",
        undershirt = "Atlet/Kemerler",
        color = "Renk",
        jacket = "Mont/Üst",
        vests = "Yelekler",
        decals = "Desenler",
        acessory = "Boyun aksesuarları",
        bags = "Çantalar",
        pants = "Pantolon",
        shoes = "Ayakkabılar",
        eye_color = "Göz rengi",
        moles = "Benler/Çiller",
        opacity = "Opaklık",
        nose_width = "Burun genişliği",
        width = "Genişlik",
        nose_peak_height = "Burun ucu yüksekliği",
        height = "Yükseklik",
        nose_peak_length = "Burun ucu uzunluğu",
        length = "Uzunluk",
        nose_bone_height = "Burun kemiği yüksekliği",
        nose_peak_lowering = "Burun ucu alçaltma",
        lowering = "Alçaltma",
        nose_bone_twist = "Burun kemiği bükümü",
        twist = "Büküm",
        eyebrow_height = "Kaş yüksekliği",
        eyebrow_depth = "Kaş derinliği",
        depth = "Derinlik",
        cheeks_height = "Yanak yüksekliği",
        cheeks_width = "Yanak genişliği",
        cheeks_depth = "Yanak derinliği",
        eyes_opening = "Göz açıklığı",
        opening = "Açıklık",
        lips_thickness = "Dudak kalınlığı",
        thickness = "Kalınlık",
        jaw_bone_width = "Çene genişliği",
        jaw_bone_length = "Çene uzunluğu",
        chin_height = "Çene kemiği yüksekliği",
        chin_width = "Çene kemiği genişliği",
        butt_chin = "Çene gamzesi",
        size = "Boyut",
        neck_thickness = "Boyun kalınlığı",
        ageing = "Yaşlanma",
        hair = "Saç",
        eyebrow = "Kaşlar",
        facial_hair = "Yüz kılı",
        lipstick = "Ruj",
        blush = "Allık",
        makeup = "Makyaj",
        mask = "Maskeler",
        hat = "Şapkalar",
        glasses = "Gözlükler",
        ear_accessories = "Kulak aksesuarları",
        watch = "Saatler",
        bracelet = "Bileklikler",
        btn_confirm = "Onayla",
        btn_cancel = "İptal",
        btn_saveOutfit = "Kıyafeti kaydet",
        outfit_name = "Kıyafet adı",

        -- u-core: yalnızca React arayüzü tarafından kullanılan yeni
        -- anahtarlar. Lang:replace() Polyglot fallback zincirini
        -- korumadığı için her dilde çevrilir.
        outfit_name_hint = "Bu kıyafeti kaydetmek için bir isim seç.",
        outfit_name_required = "İsim gerekli",
        no_room_outfits = "Hazır kıyafet yok",
        no_saved_outfits = "Kayıtlı kıyafet yok",
        cam_full = "Tüm vücut",
        cam_face = "Yüz",
        cam_torso = "Gövde",
        cam_legs = "Bacaklar",
        rotate_left = "Sola döndür",
        rotate_right = "Sağa döndür"
    },

    notify = {
        error_bracelet = "Ayak bilekliğini çıkaramazsın ...",
        info_deleteOutfit = "%{outfit} kıyafetini sildin!"
    }
}

if GetConvar('qb_locale', 'en') == 'tr' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
