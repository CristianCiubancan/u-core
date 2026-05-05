local Translations = {
    notifications = {
        ["char_deleted"] = "¡Personaje eliminado!",
        ["deleted_other_char"] = "Has borrado con éxito el personaje con id de ciudadano %{citizenid}",
        ["forgot_citizenid"] = "¡Olvidaste introducir un id de ciudadano!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Borra el personaje de otro jugador",
        ["citizenid"] = "ID del ciudadano",
        ["citizenid_help"] = "El ID de ciudadano del personaje que quieres eliminar",

        -- /logout
        ["logout_description"] = "Cierre de sesión del personaje (sólo para el administrador)",

        -- /closeNUI
        ["closeNUI_description"] = "Cerrar Multi NUI"
    },

    misc = {
        ["droppedplayer"] = "Se ha desconectado de QBCore"
    },

    ui = {
        -- Main
        characters_header = "Mis personajes",
        emptyslot = "Ranura vacía",
        play_button = "Jugar",
        create_button = "Crear personaje",
        delete_button = "Eliminar personaje",

        -- Character Information
        charinfo_header = "Información del personaje",
        charinfo_description = "Selecciona una ranura de personaje para ver toda la información sobre tu personaje",
        name = "Nombre",
        male = "Hombre",
        female = "Mujer",
        firstname = "Nombre",
        lastname = "Apellido",
        nationality = "Nacionalidad",
        gender = "Género",
        birthdate = "Fecha de nacimiento",
        job = "Trabajo",
        jobgrade = "Grado de trabajo",
        cash= "Dinero",
        bank = "Banco",
        phonenumber = "Número de teléfono",
        accountnumber = "Número de cuenta",

        chardel_header = "Registro de personajes",

        -- Delete character
        deletechar_header = "Borrar personaje",
        deletechar_description = "¿Seguro que quieres borrar tu personaje?",

        -- Buttons
        cancel = "Cancelar",
        confirm = "Confirmar",

        -- Loading Text
        retrieving_playerdata = "Recuperando datos del jugador",
        validating_playerdata = "Validando los datos del jugador",
        retrieving_characters = "Recuperando personajes",
        validating_characters = "Validación de personajes",

        -- Notifications
        ran_into_issue = "Nos encontramos con un problema",
        profanity = "¡Parece que está intentando utilizar algún tipo de blasfemia / malas palabras en su nombre o nacionalidad!",
        forgotten_field = "¡Parece que ha olvidado introducir uno o varios campos!",

        -- u-core: claves consumidas por la interfaz React (validación
        -- y textos de la interfaz). Traducidas por idioma porque el
        -- intercambio en runtime mediante Lang:replace() no preserva
        -- la cadena de fallback de Polyglot — las claves faltantes no
        -- aparecerían en el payload `translations` enviado a la UI.
        firstname_too_short = "El nombre debe tener al menos 2 caracteres.",
        firstname_too_long = "El nombre no puede superar los 16 caracteres.",
        lastname_too_short = "El apellido debe tener al menos 2 caracteres.",
        lastname_too_long = "El apellido no puede superar los 16 caracteres.",
        invalid_date = "Por favor, introduce una fecha de nacimiento válida.",
        err_required = "Obligatorio",
        err_too_short = "Demasiado corto",
        err_too_long = "Demasiado largo",
        err_profanity = "No permitido",
        err_invalid_date = "Fecha inválida",
        select_character = "Selecciona un personaje",
        select_character_subtitle = "Elige una casilla para empezar o crear una nueva identidad.",
        empty_slot = "Casilla vacía",
        new_character = "Nuevo personaje",
        disconnect = "Desconectar"
    }
}

if GetConvar('qb_locale', 'en') == 'es' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
