Feature: Cadastro de Metas para Turmas
  Background:
    GIVEN a turma "engenharia-de-software-e-sistemas" existe no sistema
    AND estou na página de criação de metas da turma "engenharia-de-software-e-sistemas"

  Scenario: Criar metas com sucesso
    GIVEN não existe nenhuma meta cadastrada na turma "engenharia-de-software-e-sistemas"
    WHEN eu envio as metas da turma com os títulos:
      | Requisitos |
      | Testes de software |
    AND eu submeto a criação de metas
    THEN vejo a notificação "Metas criadas com sucesso!"
    AND a listagem de metas da turma "engenharia-de-software-e-sistemas" exibe os itens com títulos "Requisitos" e "Testes de software"

  Scenario: Tentar criar metas com títulos duplicados no mesmo envio
    GIVEN não existe nenhuma meta cadastrada na turma "engenharia-de-software-e-sistemas"
    WHEN eu envio as metas da turma com os títulos:
      | Requisitos |
      | Requisitos |
    AND eu submeto o formulário de criação de metas
    THEN vejo a mensagem de erro "Metas não podem conter duplicatas!"
    AND nenhuma meta é criada na turma "engenharia-de-software-e-sistemas"

  Scenario: Atualizar metas para serem criadas
    GIVEN as seguintes metas já foram adicionadas para a criação na turma "engenharia-de-software-e-sistemas":
      | Requisitos |
      | Testes de software |
      |Refatoração |
    WHEN eu edito as metas adicionadas para a criação, alterando os títulos para:
      | Gerência de projetos |
      | Testes de software |
      | Refatoração |
    THEN eu vejo a lista de metas adicionadas para criação atualizada com os títulos:
      | Gerência de projetos |
      | Testes de software |
      | Refatoração |
  
  Scenario: Remover metas antes de serem criadas
    GIVEN as seguintes metas já foram adicionadas para a criação na turma "engenharia-de-software-e-sistemas":
      | Requisitos |
      | Testes de software |
      | Refatoração |
    WHEN eu removo a meta com o título "Testes de software" da lista de metas adicionadas para criação
    THEN eu vejo a lista de metas adicionadas para criação atualizada com os títulos:
      | Requisitos |
      | Refatoração |
