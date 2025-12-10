@server
Feature: Gerenciamento de Metas no Servidor
  Como um sistema
  Eu quero gerenciar as metas das turmas através da API
  Para que os dados das metas sejam armazenados e validados corretamente

  Background:
    Given o servidor está disponível

  Scenario: Criar metas para uma turma via API com sucesso
    Given a turma "engenharia-de-software-e-sistemas" existe no servidor
    And não existem metas cadastradas para a turma "engenharia-de-software-e-sistemas" no servidor
    When eu envio uma requisição para criar as metas para a turma "engenharia-de-software-e-sistemas":
      | titulo             |
      | Requisitos         |
      | Testes de software |
    Then a requisição deve ser aceita com sucesso
    And o servidor deve conter as metas "Requisitos" e "Testes de software" associadas à turma "engenharia-de-software-e-sistemas"

  Scenario: Tentar criar meta com título vazio via API
    Given a turma "engenharia-de-software-e-sistemas" existe no servidor
    When eu envio uma requisição para criar as metas para a turma "engenharia-de-software-e-sistemas":
      | titulo             |
      |                    |
      | Testes de software |
    Then a requisição deve ser rejeitada com erro de validação
    And não devem existir metas cadastradas para a turma "engenharia-de-software-e-sistemas" no servidor

  Scenario: Tentar criar metas duplicadas na mesma requisição via API
    Given a turma "engenharia-de-software-e-sistemas" existe no servidor
    When eu envio uma requisição para criar as metas para a turma "engenharia-de-software-e-sistemas":
      | titulo     |
      | Requisitos |
      | Requisitos |
    Then a requisição deve ser rejeitada com erro de conflito ou validação
    And não devem existir metas cadastradas para a turma "engenharia-de-software-e-sistemas" no servidor

  Scenario: Tentar criar metas para uma turma que já possui metas
    Given a turma "sistemas-distribuidos" existe no servidor
    And a turma "sistemas-distribuidos" já possui as metas "Comunicação" e "Sincronização" no servidor
    When eu envio uma requisição para criar as metas para a turma "sistemas-distribuidos":
      | titulo      |
      | Nova Meta A |
    Then a requisição deve ser rejeitada pois a turma já possui metas
    And as metas da turma "sistemas-distribuidos" devem permanecer "Comunicação" e "Sincronização"