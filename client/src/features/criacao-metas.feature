@gui
Feature: Criacao de metas
  Background:
    Given a turma "engenharia-de-software-e-sistemas" existe no sistema
    And estou na página de criação de metas da turma "engenharia-de-software-e-sistemas"

  Scenario: Criar metas com sucesso
    Given não existe nenhuma meta cadastrada na turma "engenharia-de-software-e-sistemas"
    When adiciono as metas "Requisitos" e "Testes de software" para a turma "engenharia-de-software-e-sistemas"
    And eu submeto a criação de metas
    Then vejo a notificação "Metas criadas com sucesso!"
    And a listagem de metas da turma "engenharia-de-software-e-sistemas" exibe os itens com títulos "Requisitos" e "Testes de software"
