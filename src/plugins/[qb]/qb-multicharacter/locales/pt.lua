local Translations = {
    notifications = {
        ["char_deleted"] = "Personagem apagada!",
        ["deleted_other_char"] = "Apagou com successo, a personagem com Identificação: %{citizenid}.",
        ["forgot_citizenid"] = "Esqueceu-se de inserir a identificação do cidadão!",
        },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Apaga o personagem de outro jogador",
        ["citizenid"] = "Identificação do cidadão",
        ["citizenid_help"] = "O ID do cidadão do personagem que deseja remover",

        -- /logout
        ["logout_description"] = "Logout à personagem (Admin Only)",

        -- /closeNUI
        ["closeNUI_description"] = "Fechar Multiplos NUIs"
    },

    misc = {
        ["droppedplayer"] = "Saiu do servidor"
    },

    ui = {
        -- Main
        characters_header = "Minhas personagens",
        emptyslot = "Slot Vazia",
        play_button = "Acordar",
        create_button = "Criar Personagem",
        delete_button = "Apagar Personagem",

        -- Character Information
        charinfo_header = "Informação da personagem",
        charinfo_description = "Seleccione uma personagem, para ver as suas informações.",
        name = "Nome",
        male = "Homem",
        female = "Mulher",
        firstname = "Nome",
        lastname = "Sobrenome",
        nationality = "Nationalidade",
        gender = "Genero",
        birthdate = "Aniversário",
        job = "Profissão",
        jobgrade = "Cargo",
        cash = "Dinheiro",
        bank = "Banco",
        phonenumber = "Contacto",
        accountnumber = "Numero da Conta",

        chardel_header = "Registo de personagem",

        -- Delete character
        deletechar_header = "Apagar personagem",
        deletechar_description = "Tem a certeza, que quer apagar a sua personagem?",

        -- Buttons
        cancel = "Cancelar",
        confirm = "Confirmar",

        -- Loading Text
        retrieving_playerdata = "Carregando dados do joagador",
        validating_playerdata = "Validando dados do joagador",
        retrieving_characters = "Carregando personagens",
        validating_characters = "Validando personagens",

        -- Notifications
        ran_into_issue = "Encontramos um problema",
        profanity = "Parece que está tentando usar algum tipo de palavrão / palavrões no seu nome ou nacionalidade!",
        forgotten_field = "Parece que se esqueceu de inserir um ou vários dos campos!",

        -- u-core: chaves consumidas pela UI React (validação + textos
        -- da interface). Traduzidas por locale porque a troca em tempo
        -- de execução via Lang:replace() não preserva a cadeia de
        -- fallback do Polyglot — as chaves em falta não apareceriam
        -- no payload `translations` enviado à UI React.
        firstname_too_short = "O nome deve ter pelo menos 2 caracteres.",
        firstname_too_long = "O nome não pode exceder 16 caracteres.",
        lastname_too_short = "O apelido deve ter pelo menos 2 caracteres.",
        lastname_too_long = "O apelido não pode exceder 16 caracteres.",
        invalid_date = "Insira uma data de nascimento válida.",
        err_required = "Obrigatório",
        err_too_short = "Demasiado curto",
        err_too_long = "Demasiado longo",
        err_profanity = "Não permitido",
        err_invalid_date = "Data inválida",
        select_character = "Selecionar uma personagem",
        select_character_subtitle = "Escolhe um espaço para começar ou criar uma nova identidade.",
        empty_slot = "Espaço vazio",
        new_character = "Nova personagem",
        disconnect = "Desconectar"
        }
}

if GetConvar('qb_locale', 'en') == 'pt' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end
