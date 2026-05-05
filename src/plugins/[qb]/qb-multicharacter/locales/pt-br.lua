local Translations = {
    notifications = {
        ["char_deleted"] = "Personagem excluído!",
        ["deleted_other_char"] = "Você excluiu com sucesso o personagem com o ID do cidadão %{citizenid}.",
        ["forgot_citizenid"] = "Você esqueceu de inserir um ID de cidadão!",
    },

    commands = {
        -- /deletechar
        ["deletechar_description"] = "Exclui o personagem de outro jogador",
        ["citizenid"] = "ID do Cidadão",
        ["citizenid_help"] = "O ID do cidadão do personagem que você deseja excluir",

        -- /logout
        ["logout_description"] = "Sair do Personagem (Apenas para Administradores)",

        -- /closeNUI
        ["closeNUI_description"] = "Fechar Multi NUI"
    },

    misc = {
        ["droppedplayer"] = "Você desconectou do QBCore"
    },

    ui = {
        -- Principal
        characters_header = "Meus Personagens",
        emptyslot = "Slot Vazio",
        play_button = "Jogar",
        create_button = "Criar Personagem",
        delete_button = "Excluir Personagem",

        -- Informações do Personagem
        charinfo_header = "Informações do Personagem",
        charinfo_description = "Selecione um slot de personagem para ver todas as informações sobre o seu personagem.",
        name = "Nome",
        male = "Masculino",
        female = "Feminino",
        firstname = "Primeiro Nome",
        lastname = "Sobrenome",
        nationality = "Nacionalidade",
        gender = "Gênero",
        birthdate = "Data de Nascimento",
        job = "Emprego",
        jobgrade = "Grau de Emprego",
        cash = "Dinheiro",
        bank = "Banco",
        phonenumber = "Número de Telefone",
        accountnumber = "Número da Conta",

        chardel_header = "Registro de Personagem",

        -- Excluir personagem
        deletechar_header = "Excluir Personagem",
        deletechar_description = "Você tem certeza de que deseja excluir o seu personagem?",

        -- Botões
        cancel = "Cancelar",
        confirm = "Confirmar",

        -- Texto de Carregamento
        retrieving_playerdata = "Recuperando dados do jogador",
        validating_playerdata = "Validando dados do jogador",
        retrieving_characters = "Recuperando personagens",
        validating_characters = "Validando personagens",

        -- Notificações
        ran_into_issue = "Encontramos um problema",
        profanity = "Parece que você está tentando usar algum tipo de palavrão ou palavra inadequada em seu nome ou nacionalidade!",
        forgotten_field = "Parece que você esqueceu de inserir um ou vários campos!",

        -- u-core: chaves consumidas pela UI React (validação + textos
        -- da interface). Traduzidas por locale porque a troca em tempo
        -- de execução via Lang:replace() não preserva a cadeia de
        -- fallback do Polyglot — chaves ausentes não apareceriam no
        -- payload `translations` enviado à UI React.
        firstname_too_short = "O nome deve ter pelo menos 2 caracteres.",
        firstname_too_long = "O nome não pode exceder 16 caracteres.",
        lastname_too_short = "O sobrenome deve ter pelo menos 2 caracteres.",
        lastname_too_long = "O sobrenome não pode exceder 16 caracteres.",
        invalid_date = "Insira uma data de nascimento válida.",
        err_required = "Obrigatório",
        err_too_short = "Curto demais",
        err_too_long = "Longo demais",
        err_profanity = "Não permitido",
        err_invalid_date = "Data inválida",
        select_character = "Selecionar um personagem",
        select_character_subtitle = "Escolha um espaço para começar ou criar uma nova identidade.",
        empty_slot = "Espaço vazio",
        new_character = "Novo personagem",
        disconnect = "Desconectar"
    }
}

if GetConvar('qb_locale', 'en') == 'pt-br' then
    Lang = Locale:new({
        phrases = Translations,
        warnOnMissing = true,
        fallbackLang = Lang,
    })
end

