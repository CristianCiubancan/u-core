local Translations = {
    notifications = {
        ["char_deleted"] = "Karakter silindi!",
        ["deleted_other_char"] = "Başarıyla vatandaş kimliği %{citizenid} olan karakteri sildiniz.",
        ["forgot_citizenid"] = "Vatandaş kimliği girmeyi unuttunuz gibi görünüyor!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Başka bir oyuncunun karakterini siler",
        ["citizenid"] = "Vatandaş Kimliği",
        ["citizenid_help"] = "Silmek istediğiniz karakterin vatandaş kimliği",

        -- /logout
        ["logout_description"] = "Karakterden çıkış yap (Yalnızca Admin)",

        -- /closeNUI
        ["closeNUI_description"] = "Çoklu NUI'yi Kapat"
    },

    misc = {
        ["droppedplayer"] = "QBCore'dan çıkış yaptınız"
    },

    ui = {
        -- Ana
        characters_header = "Karakterlerim",
        emptyslot = "Boş Yuva",
        play_button = "Oyna",
        create_button = "Karakter Oluştur",
        delete_button = "Karakteri Sil",

        -- Karakter Bilgileri
        charinfo_header = "Karakter Bilgileri",
        charinfo_description = "Tüm karakter bilgilerinizi görmek için bir karakter yuvası seçin.",
        name = "Adı",
        male = "Erkek",
        female = "Kadın",
        firstname = "İsim",
        lastname = "Soyadı",
        nationality = "Uyruk",
        gender = "Cinsiyet",
        birthdate = "Doğum Tarihi",
        job = "Meslek",
        jobgrade = "Meslek Derecesi",
        cash = "Nakit",
        bank = "Banka",
        phonenumber = "Telefon Numarası",
        accountnumber = "Hesap Numarası",

        chardel_header = "Karakter Kaydı",

        -- Karakteri Sil
        deletechar_header = "Karakteri Sil",
        deletechar_description = "Karakterinizi silmek istediğinizden emin misiniz?",

        -- Düğmeler
        cancel = "İptal",
        confirm = "Onayla",

        -- Yükleniyor Metni
        retrieving_playerdata = "Oyuncu verileri alınıyor",
        validating_playerdata = "Oyuncu verileri doğrulanıyor",
        retrieving_characters = "Karakterler alınıyor",
        validating_characters = "Karakterler doğrulanıyor",

        -- Bildirimler
        ran_into_issue = "Bir sorunla karşılaştık",
        profanity = "Adınızda veya uyruğunuzda küfürlü veya kötü kelimeler kullanmaya çalışıyormuş gibi görünüyor!",
        forgotten_field = "Bir veya daha fazla alanı girmeyi unuttuğunuz gibi görünüyor!",

        -- u-core: React arayüzü tarafından kullanılan anahtarlar
        -- (doğrulama yazıları ve arayüz metinleri). Her dile ayrı
        -- ayrı çevrildi çünkü Lang:replace() ile çalışma zamanında
        -- yapılan dil değişikliği Polyglot'un fallback zincirini
        -- korumaz — eksik anahtarlar `translations` payload'una
        -- girmez ve React arayüzünde görünmez.
        firstname_too_short = "Ad en az 2 karakter olmalıdır.",
        firstname_too_long = "Ad 16 karakteri geçemez.",
        lastname_too_short = "Soyad en az 2 karakter olmalıdır.",
        lastname_too_long = "Soyad 16 karakteri geçemez.",
        invalid_date = "Lütfen geçerli bir doğum tarihi girin.",
        err_required = "Gerekli",
        err_too_short = "Çok kısa",
        err_too_long = "Çok uzun",
        err_profanity = "İzin verilmiyor",
        err_invalid_date = "Geçersiz tarih",
        select_character = "Karakter seç",
        select_character_subtitle = "Başlamak için bir slot seç veya yeni bir kimlik oluştur.",
        empty_slot = "Boş slot",
        new_character = "Yeni karakter",
        disconnect = "Bağlantıyı kes"
    }
}

if GetConvar('qb_locale', 'en') == 'tr' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
