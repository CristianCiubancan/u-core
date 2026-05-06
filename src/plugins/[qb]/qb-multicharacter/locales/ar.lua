local Translations = {
    notifications = {
        ["char_deleted"] = "تم حذف الشخصية!",
        ["deleted_other_char"] = "لقد قمت بحذف الشخصية رقم الايدي  %{citizenid}.",
        ["forgot_citizenid"] = "لقد نسيت ادخال رقم الايدي الخاص بالشخصية citizenid!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "حذف شخصية لاعب آخر",
        ["citizenid"] = "ايدي الشخصية",
        ["citizenid_help"] = "ايدي الشخصية للاعب الذي تريد حذف شخصيته",

        -- /logout
        ["logout_description"] = "تسجيل خروج الشخصية (Admin Only)",

        -- /closeNUI
        ["closeNUI_description"] = "إغلاق النوافذ المتعددة"
    },

    misc = {
        ["droppedplayer"] = "انقطع الاتصال مع السيرفر"
    },

    ui = {
        -- Main
        characters_header = "شخصياتي",
        emptyslot = "فارغة",
        play_button = "إبدا",
        create_button = "إنشاء شخصية",
        delete_button = "حذف شخصية",

        -- Character Information
        charinfo_header = "معلومات الشخصية",
        charinfo_description = "اختر الشخصية لترى جميع المعلومات المتعلقة بهته الشخصية.",
        name = "الإسم",
        male = "رجل",
        female = "إمرأة",
        firstname = "الإسم الأول",
        lastname = "اسم العائلة",
        nationality = "الجنسية",
        gender = "الجنس",
        birthdate = "الميلاد",
        job = "الوظيفة",
        jobgrade = "رتبة الوظيفة",
        cash = "الأموال",
        bank = "اموال البنك",
        phonenumber = "رقم الهاتف",
        accountnumber = "رقم الحساب",

        chardel_header = "تسجيل سخصية",

        -- Delete character
        deletechar_header = "حذف شخصية",
        deletechar_description = "هل أنت متاكد من حذفك للشخصية?",

        -- Buttons
        cancel = "الغاء",
        confirm = "تاكيد",

        -- Loading Text
        retrieving_playerdata = "جلب معلومات اللاعب",
        validating_playerdata = "تأكيد معلومات اللاعب",
        retrieving_characters = "جلب الشخصيات",
        validating_characters = "تاكيد الشخصيات",

        -- Notifications
        ran_into_issue = "واجهتنا مشكلة",
        profanity = "يبدو انك تحاول استخدام اسم غير لائق في اسمك او جنسيتك حاول مرة اخرى!",
        forgotten_field = "يبدو أنك نسيت ادخال بعض المعلومات تحقق مرة اخرى!",

        -- u-core: مفاتيح تستخدمها واجهة React (التحقق من الإدخال
        -- ونصوص الواجهة). تُترجم لكل لغة على حدة لأن استبدال اللغة
        -- في وقت التشغيل عبر Lang:replace() لا يحافظ على سلسلة
        -- fallback الخاصة بـ Polyglot — المفاتيح المفقودة لن تظهر
        -- في حمولة `translations` المرسلة إلى الواجهة.
        firstname_too_short = "يجب أن يتكون الاسم الأول من حرفين على الأقل.",
        firstname_too_long = "لا يمكن أن يتجاوز الاسم الأول 16 حرفاً.",
        lastname_too_short = "يجب أن يتكون اسم العائلة من حرفين على الأقل.",
        lastname_too_long = "لا يمكن أن يتجاوز اسم العائلة 16 حرفاً.",
        invalid_date = "يرجى إدخال تاريخ ميلاد صالح.",
        err_required = "مطلوب",
        err_too_short = "قصير جداً",
        err_too_long = "طويل جداً",
        err_profanity = "غير مسموح",
        err_invalid_date = "تاريخ غير صالح",
        select_character = "اختر شخصية",
        select_character_subtitle = "اختر خانة للبدء أو إنشاء هوية جديدة.",
        empty_slot = "خانة فارغة",
        new_character = "شخصية جديدة",
        disconnect = "قطع الاتصال",
        loading_countries = "جاري تحميل الدول",
        search_nationality = "ابحث عن الجنسية",
        no_matches = "لا توجد نتائج"
    }
}

if GetConvar('qb_locale', 'en') == 'ar' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
