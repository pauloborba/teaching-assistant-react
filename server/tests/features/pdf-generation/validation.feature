Feature: Geração de PDF (Validações e Erros)

  Background:
    Given o DataService possui uma turma "Engenharia de Software" com id "turma-123"

  Scenario: Tentar gerar ZIP de uma prova que não possui questões
    Given o DataService possui uma prova "Prova Vazia" com id "200" vinculada à turma "turma-123" contendo 0 questões
    When uma requisição "GET" for enviada para "/api/exams/200/zip" com query params:
      | classId   | quantity |
      | turma-123 | 1        |
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter a mensagem de erro "Esta prova não possui questões vinculadas."
    And o sistema não deve registrar nada no histórico

  Scenario: Tentar gerar ZIP com quantidade inválida (Zero)
    Given o DataService possui uma prova "Prova Valida" com id "100" vinculada à turma "turma-123" contendo 2 questões
    When uma requisição "GET" for enviada para "/api/exams/100/zip" com query params:
      | classId   | quantity |
      | turma-123 | 0        |
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter a mensagem de erro "Quantidade inválida."
    And o sistema não deve registrar nada no histórico

  Scenario: Tentar gerar ZIP de uma prova informando a turma errada
    Given o DataService possui uma prova "Prova de Outra Turma" com id "300" vinculada à turma "turma-456"
    When uma requisição "GET" for enviada para "/api/exams/300/zip" com query params:
      | classId   | quantity |
      | turma-123 | 1        |
    Then o status da resposta deve ser "404"
    And o JSON da resposta deve conter a mensagem de erro "Prova não encontrada."
    And o sistema não deve registrar nada no histórico