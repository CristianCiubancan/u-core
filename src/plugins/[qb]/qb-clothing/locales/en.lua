local Translations = {
    store = {
        barber = "Barbershop",
        surgeon = "Plastic Surgeon",
        clothing = "Clothing store",
        outfitchanger = "Outfit Changer"
    },

    outfits = {
        roomOutfits = "Presets",
        myOutfits = "My Outfits",
        character = "Clothing",
        accessoires = "Accessories"
    },

    menu = {
        hair = "Hair",
        character = "Clothing",
        accessoires = "Accessories",
        features = "Features"
    },

    ui = {
        select = "Select",
        delete = "Delete",
        -- u-core: upstream en.lua shipped this as "Selecionar Outfit"
        -- (Portuguese leak), but the upstream Vue HTML never read this
        -- key — the room-outfit Select button hardcodes "Select Outfit"
        -- text behind a `data-tkey="select"` lookup. Our React port reads
        -- this key directly so the bug would surface; restore the
        -- intended English string.
        select_outfit = "Select Outfit",
        player_model = "Player Model",
        model = "Model",
        mother = "Mother",
        father = "Father",
        texture = "Texture",
        type = "Type",
        item = "Item",
        skin_color = "Skin Color",
        parent_mixer = "Parent Mixer",
        shape_mix = "Shape Mix",
        skin_mix = "Skin Mix",
        arms = "Arms",
        undershirt = "Undershirt/Belts",
        color = "Color",
        jacket = "Jackets/Tops",
        vests = "Vests",
        decals = "Decals",
        acessory = "Neck Accessories",
        bags = "Bags",
        pants = "Pants",
        shoes = "Shoes",
        eye_color = "Eye Color",
        moles = "Moles/Freckles",
        opacity = "Opacity",
        nose_width = "Nose Width",
        width = "Width",
        nose_peak_height = "Nose Peak Height",
        height = "Height",
        nose_peak_length = "Nose Peak Length",
        length = "Length",
        nose_bone_height = "Nose Bone Height",
        nose_peak_lowering = "Nose Peak Lowering",
        lowering = "Lowering",
        nose_bone_twist = "Nose Bone Twist",
        twist = "Twist",
        eyebrow_height = "Eyebrow Height",
        eyebrow_depth = "Eyebrow Depth",
        depth = "Depth",
        cheeks_height = "Cheeks Height",
        cheeks_width = "Cheeks Width",
        cheeks_depth = "Cheeks Depth",
        eyes_opening = "Eyes Opening",
        opening = "Opening",
        lips_thickness = "Lips Thickness",
        thickness = "Thickness",
        jaw_bone_width = "Jaw Bone Width",
        jaw_bone_length = "Jaw Bone Length",
        chin_height = "Chin Bone Height",
        chin_width = "Chin Bone Width",
        butt_chin  ="Butt Chin",
        size = "Size",
        neck_thickness = "Neck Thickness",
        ageing = "Ageing",
        hair = "Hair",
        eyebrow = "Eyebrows",
        facial_hair = "Facial Hair",
        lipstick = "Lipstick",
        blush = "Blush",
        makeup = "Makeup",
        mask = "Masks",
        hat = "Hats",
        glasses = "Glasses",
        ear_accessories = "Ear Accessories",
        watch = "Watches",
        bracelet = "Bracelets",
        btn_confirm = "Confirm",
        btn_cancel = "Cancel",
        btn_saveOutfit = "Save Outfit",
        outfit_name = "Outfit Name",

        -- u-core: keys consumed by the React webview only. Upstream Vue
        -- HTML carried the `Save Outfit Name` modal heading and a few
        -- decorative labels as hardcoded text (not data-tkey). Adding
        -- them here lets `Lang:t('ui.<key>')` flow through the
        -- SendNUIMessage('open').translations payload to the React tx()
        -- helper. Mirrored across all 16 other locale files under
        -- matching `-- u-core:` blocks — runtime Lang:replace() swaps
        -- don't preserve Polyglot's fallback chain, so each locale must
        -- carry its own translations or those keys would silently drop
        -- from the payload.
        outfit_name_hint = "Pick a name to save this outfit under.",
        outfit_name_required = "Name required",
        no_room_outfits = "No preset outfits",
        no_saved_outfits = "No saved outfits",

        -- u-core: tooltips on the camera-zoom + ped-rotation column.
        cam_full = "Full",
        cam_face = "Face",
        cam_torso = "Torso",
        cam_legs = "Legs",
        rotate_left = "Rotate left",
        rotate_right = "Rotate right"
    },

    notify = {
        error_bracelet = "You can't remove your ankle bracelet ...",
        info_deleteOutfit = "You have deleted your %{outfit} outfit!"
    }
}

Lang = Lang or Locale:new({
    phrases = Translations,
    warnOnMissing = true
})