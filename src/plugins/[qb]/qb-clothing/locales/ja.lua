local Translations = {
    store = {
        barber = "理髪店",
        surgeon = "美容整形外科",
        clothing = "服飾店",
        outfitchanger = "衣装チェンジャー"
    },

    outfits = {
        roomOutfits = "プリセット",
        myOutfits = "マイ衣装",
        character = "服",
        accessoires = "アクセサリー"
    },

    menu = {
        hair = "髪",
        character = "服",
        accessoires = "アクセサリー",
        features = "特徴"
    },

    ui = {
        select = "選択",
        delete = "削除",
        select_outfit = "衣装を選択",
        player_model = "プレイヤーモデル",
        model = "モデル",
        mother = "母",
        father = "父",
        texture = "テクスチャ",
        type = "タイプ",
        item = "アイテム",
        skin_color = "肌の色",
        parent_mixer = "親ミキサー",
        shape_mix = "形状ミックス",
        skin_mix = "肌ミックス",
        arms = "腕",
        undershirt = "アンダーシャツ／ベルト",
        color = "色",
        jacket = "ジャケット／トップス",
        vests = "ベスト",
        decals = "デカール",
        acessory = "首アクセサリー",
        bags = "バッグ",
        pants = "パンツ",
        shoes = "靴",
        eye_color = "目の色",
        moles = "ほくろ／そばかす",
        opacity = "不透明度",
        nose_width = "鼻の幅",
        width = "幅",
        nose_peak_height = "鼻先の高さ",
        height = "高さ",
        nose_peak_length = "鼻先の長さ",
        length = "長さ",
        nose_bone_height = "鼻骨の高さ",
        nose_peak_lowering = "鼻先の下げ",
        lowering = "下げ",
        nose_bone_twist = "鼻骨のひねり",
        twist = "ひねり",
        eyebrow_height = "眉の高さ",
        eyebrow_depth = "眉の深さ",
        depth = "深さ",
        cheeks_height = "頬の高さ",
        cheeks_width = "頬の幅",
        cheeks_depth = "頬の深さ",
        eyes_opening = "目の開き",
        opening = "開き",
        lips_thickness = "唇の厚さ",
        thickness = "厚さ",
        jaw_bone_width = "顎の幅",
        jaw_bone_length = "顎の長さ",
        chin_height = "顎骨の高さ",
        chin_width = "顎骨の幅",
        butt_chin = "あごのくぼみ",
        size = "サイズ",
        neck_thickness = "首の太さ",
        ageing = "老化",
        hair = "髪",
        eyebrow = "眉",
        facial_hair = "ひげ",
        lipstick = "口紅",
        blush = "チーク",
        makeup = "メイク",
        mask = "マスク",
        hat = "帽子",
        glasses = "眼鏡",
        ear_accessories = "耳アクセサリー",
        watch = "時計",
        bracelet = "ブレスレット",
        btn_confirm = "確定",
        btn_cancel = "キャンセル",
        btn_saveOutfit = "衣装を保存",
        outfit_name = "衣装名",

        -- u-core: React UIでのみ使用される新しいキー。Lang:replace()
        -- がPolyglotのフォールバックチェーンを保持しないため、言語
        -- ごとに翻訳。
        outfit_name_hint = "この衣装を保存する名前を選んでください。",
        outfit_name_required = "名前が必要",
        no_room_outfits = "プリセット衣装なし",
        no_saved_outfits = "保存された衣装なし",
        cam_full = "全身",
        cam_face = "顔",
        cam_torso = "胴体",
        cam_legs = "脚",
        rotate_left = "左に回転",
        rotate_right = "右に回転"
    },

    notify = {
        error_bracelet = "足首ブレスレットを外すことはできません ...",
        info_deleteOutfit = "%{outfit}の衣装を削除しました！"
    }
}

if GetConvar('qb_locale', 'en') == 'ja' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
