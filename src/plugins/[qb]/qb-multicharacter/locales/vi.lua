local Translations = {
    notifications = {
        ["char_deleted"] = "Đã xóa nhân vật!",
        ["deleted_other_char"] = "Bạn đã xóa thành công nhân vật có số căn cước công dân %{citizenid}.",
        ["forgot_citizenid"] = "Bạn quên nhập số căn cước công dân!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Xóa nhân vật của người chơi khác",
        ["citizenid"] = "Số căn cước",
        ["citizenid_help"] = "Số căn cước của công dân muốn xóa",

        -- /logout
        ["logout_description"] = "Đăng xuất nhân vật (Admin Only)",

        -- /closeNUI
        ["closeNUI_description"] = "Close Multi NUI"
    },

    misc = {
        ["droppedplayer"] = "Bạn đã ngắt kết nối khỏi QBCore"
    },

    ui = {
        -- Main
        characters_header = "Nhân vật của tôi",
        emptyslot = "Vị trí trống",
        play_button = "Vào game",
        create_button = "Tạo nhân vật",
        delete_button = "Xóa nhân vật",

        -- Character Information
        charinfo_header = "Thông tin nhân vật",
        charinfo_description = "Chọn một vị trí ký tự để xem tất cả thông tin về nhân vật của bạn.",
        name = "Tên",
        male = "Nam",
        female = "Nữ",
        firstname = "Tên",
        lastname = "Họ",
        nationality = "Quốc gia",
        gender = "Giới tính",
        birthdate = "Ngày sinh",
        job = "Công việc",
        jobgrade = "Cấp bậc công việc",
        cash = "Tiền mặt",
        bank = "Tiền ngân hàng",
        phonenumber = "Số điện thoại",
        accountnumber = "Số tài khoản",

        chardel_header = "Đăng ký nhân vật",

        -- Delete character
        deletechar_header = "Xóa nhân vật",
        deletechar_description = "Bạn có chắc chắn muốn xóa nhân vật của mình?",

        -- Buttons
        cancel = "Hủy bỏ",
        confirm = "Xác nhận",

        -- Loading Text
        retrieving_playerdata = "Đang lấy dữ liệu",
        validating_playerdata = "Đang xác minh dữ liệu",
        retrieving_characters = "Đang lấy thông tin",
        validating_characters = "Đang xác minh thông tin",

        -- Notifications
        ran_into_issue = "Chúng tôi gặp sự cố",
        profanity = "Có vẻ như bạn đang cố gắng sử dụng một số từ ngữ tục tĩu/xấu xa trong tên hoặc quốc tịch của bạn!",
        forgotten_field = "Có vẻ như bạn đã quên nhập một hoặc nhiều trường!",

        -- u-core: các khóa được giao diện React sử dụng (xác thực biểu
        -- mẫu và văn bản giao diện). Dịch riêng cho từng locale vì
        -- việc đổi ngôn ngữ tại runtime qua Lang:replace() không giữ
        -- chuỗi fallback của Polyglot — các khóa thiếu sẽ không xuất
        -- hiện trong payload `translations` gửi đến giao diện React.
        firstname_too_short = "Tên phải có ít nhất 2 ký tự.",
        firstname_too_long = "Tên không được vượt quá 16 ký tự.",
        lastname_too_short = "Họ phải có ít nhất 2 ký tự.",
        lastname_too_long = "Họ không được vượt quá 16 ký tự.",
        invalid_date = "Vui lòng nhập ngày sinh hợp lệ.",
        err_required = "Bắt buộc",
        err_too_short = "Quá ngắn",
        err_too_long = "Quá dài",
        err_profanity = "Không được phép",
        err_invalid_date = "Ngày không hợp lệ",
        select_character = "Chọn nhân vật",
        select_character_subtitle = "Chọn ô để bắt đầu hoặc tạo nhân vật mới.",
        empty_slot = "Ô trống",
        new_character = "Nhân vật mới",
        disconnect = "Ngắt kết nối",
        loading_countries = "Đang tải các quốc gia",
        search_nationality = "Tìm quốc tịch",
        no_matches = "Không có kết quả"
    }
}

if GetConvar('qb_locale', 'en') == 'vi' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
