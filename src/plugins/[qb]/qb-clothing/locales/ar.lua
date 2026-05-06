local Translations = {
    store = {
        barber = "حلاق",
        surgeon = "جراح تجميل",
        clothing = "متجر الملابس",
        outfitchanger = "مبدّل الإطلالة"
    },

    outfits = {
        roomOutfits = "إطلالات جاهزة",
        myOutfits = "إطلالاتي",
        character = "ملابس",
        accessoires = "إكسسوارات"
    },

    menu = {
        hair = "شعر",
        character = "ملابس",
        accessoires = "إكسسوارات",
        features = "ملامح"
    },

    ui = {
        select = "اختر",
        delete = "حذف",
        select_outfit = "اختر إطلالة",
        player_model = "نموذج اللاعب",
        model = "نموذج",
        mother = "الأم",
        father = "الأب",
        texture = "نسيج",
        type = "نوع",
        item = "عنصر",
        skin_color = "لون البشرة",
        parent_mixer = "مزج الوالدين",
        shape_mix = "مزج الشكل",
        skin_mix = "مزج البشرة",
        arms = "ذراعان",
        undershirt = "قميص داخلي/أحزمة",
        color = "لون",
        jacket = "سترات/قمصان علوية",
        vests = "صدريات",
        decals = "ملصقات",
        acessory = "إكسسوارات الرقبة",
        bags = "حقائب",
        pants = "بنطلونات",
        shoes = "أحذية",
        eye_color = "لون العين",
        moles = "شامات/نمش",
        opacity = "العتامة",
        nose_width = "عرض الأنف",
        width = "عرض",
        nose_peak_height = "ارتفاع طرف الأنف",
        height = "ارتفاع",
        nose_peak_length = "طول طرف الأنف",
        length = "طول",
        nose_bone_height = "ارتفاع عظم الأنف",
        nose_peak_lowering = "خفض طرف الأنف",
        lowering = "خفض",
        nose_bone_twist = "التواء عظم الأنف",
        twist = "التواء",
        eyebrow_height = "ارتفاع الحاجب",
        eyebrow_depth = "عمق الحاجب",
        depth = "عمق",
        cheeks_height = "ارتفاع الخدين",
        cheeks_width = "عرض الخدين",
        cheeks_depth = "عمق الخدين",
        eyes_opening = "فتحة العين",
        opening = "فتحة",
        lips_thickness = "سمك الشفتين",
        thickness = "سمك",
        jaw_bone_width = "عرض عظم الفك",
        jaw_bone_length = "طول عظم الفك",
        chin_height = "ارتفاع عظم الذقن",
        chin_width = "عرض عظم الذقن",
        butt_chin = "غمازة الذقن",
        size = "حجم",
        neck_thickness = "سمك الرقبة",
        ageing = "التقدم في العمر",
        hair = "شعر",
        eyebrow = "حواجب",
        facial_hair = "شعر الوجه",
        lipstick = "أحمر شفاه",
        blush = "أحمر خدود",
        makeup = "مكياج",
        mask = "أقنعة",
        hat = "قبعات",
        glasses = "نظارات",
        ear_accessories = "إكسسوارات الأذن",
        watch = "ساعات",
        bracelet = "أساور",
        btn_confirm = "تأكيد",
        btn_cancel = "إلغاء",
        btn_saveOutfit = "حفظ الإطلالة",
        outfit_name = "اسم الإطلالة",

        -- u-core: مفاتيح جديدة تُستخدم فقط في واجهة React. مترجمة لكل
        -- لغة لأن Lang:replace() لا يحافظ على سلسلة fallback في
        -- Polyglot.
        outfit_name_hint = "اختر اسماً لحفظ هذه الإطلالة تحته.",
        outfit_name_required = "الاسم مطلوب",
        no_room_outfits = "لا توجد إطلالات جاهزة",
        no_saved_outfits = "لا توجد إطلالات محفوظة",
        cam_full = "الجسم بالكامل",
        cam_face = "الوجه",
        cam_torso = "الجذع",
        cam_legs = "الساقان",
        rotate_left = "تدوير لليسار",
        rotate_right = "تدوير لليمين"
    },

    notify = {
        error_bracelet = "لا يمكنك إزالة سوار الكاحل ...",
        info_deleteOutfit = "لقد حذفت إطلالتك %{outfit}!"
    }
}

if GetConvar('qb_locale', 'en') == 'ar' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
