local Translations = {
    store = {
        barber = "Tiệm cắt tóc",
        surgeon = "Bác sĩ thẩm mỹ",
        clothing = "Cửa hàng quần áo",
        outfitchanger = "Đổi trang phục"
    },

    outfits = {
        roomOutfits = "Trang phục có sẵn",
        myOutfits = "Trang phục của tôi",
        character = "Quần áo",
        accessoires = "Phụ kiện"
    },

    menu = {
        hair = "Tóc",
        character = "Quần áo",
        accessoires = "Phụ kiện",
        features = "Đặc điểm"
    },

    ui = {
        select = "Chọn",
        delete = "Xóa",
        select_outfit = "Chọn trang phục",
        player_model = "Mẫu nhân vật",
        model = "Mẫu",
        mother = "Mẹ",
        father = "Cha",
        texture = "Họa tiết",
        type = "Loại",
        item = "Mục",
        skin_color = "Màu da",
        parent_mixer = "Trộn cha mẹ",
        shape_mix = "Pha trộn hình dáng",
        skin_mix = "Pha trộn da",
        arms = "Cánh tay",
        undershirt = "Áo lót/Thắt lưng",
        color = "Màu",
        jacket = "Áo khoác/Áo trên",
        vests = "Áo gi-lê",
        decals = "Họa tiết",
        acessory = "Phụ kiện cổ",
        bags = "Túi",
        pants = "Quần",
        shoes = "Giày",
        eye_color = "Màu mắt",
        moles = "Nốt ruồi/Tàn nhang",
        opacity = "Độ mờ",
        nose_width = "Độ rộng mũi",
        width = "Chiều rộng",
        nose_peak_height = "Độ cao đỉnh mũi",
        height = "Chiều cao",
        nose_peak_length = "Độ dài đỉnh mũi",
        length = "Chiều dài",
        nose_bone_height = "Độ cao xương mũi",
        nose_peak_lowering = "Hạ đỉnh mũi",
        lowering = "Hạ",
        nose_bone_twist = "Xoắn xương mũi",
        twist = "Xoắn",
        eyebrow_height = "Độ cao lông mày",
        eyebrow_depth = "Độ sâu lông mày",
        depth = "Độ sâu",
        cheeks_height = "Độ cao má",
        cheeks_width = "Độ rộng má",
        cheeks_depth = "Độ sâu má",
        eyes_opening = "Độ mở mắt",
        opening = "Độ mở",
        lips_thickness = "Độ dày môi",
        thickness = "Độ dày",
        jaw_bone_width = "Độ rộng xương hàm",
        jaw_bone_length = "Độ dài xương hàm",
        chin_height = "Độ cao xương cằm",
        chin_width = "Độ rộng xương cằm",
        butt_chin = "Lúm đồng tiền cằm",
        size = "Kích thước",
        neck_thickness = "Độ dày cổ",
        ageing = "Lão hóa",
        hair = "Tóc",
        eyebrow = "Lông mày",
        facial_hair = "Râu",
        lipstick = "Son môi",
        blush = "Phấn má",
        makeup = "Trang điểm",
        mask = "Khẩu trang",
        hat = "Mũ",
        glasses = "Kính",
        ear_accessories = "Phụ kiện tai",
        watch = "Đồng hồ",
        bracelet = "Vòng tay",
        btn_confirm = "Xác nhận",
        btn_cancel = "Hủy",
        btn_saveOutfit = "Lưu trang phục",
        outfit_name = "Tên trang phục",

        -- u-core: các khóa mới chỉ dùng cho giao diện React. Được dịch
        -- theo từng ngôn ngữ vì Lang:replace() không bảo toàn chuỗi
        -- fallback của Polyglot.
        outfit_name_hint = "Chọn một tên để lưu trang phục này.",
        outfit_name_required = "Cần có tên",
        no_room_outfits = "Không có trang phục có sẵn",
        no_saved_outfits = "Không có trang phục đã lưu",
        cam_full = "Toàn thân",
        cam_face = "Khuôn mặt",
        cam_torso = "Thân",
        cam_legs = "Chân",
        rotate_left = "Xoay trái",
        rotate_right = "Xoay phải"
    },

    notify = {
        error_bracelet = "Bạn không thể tháo vòng chân ...",
        info_deleteOutfit = "Bạn đã xóa trang phục %{outfit}!"
    }
}

if GetConvar('qb_locale', 'en') == 'vi' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
