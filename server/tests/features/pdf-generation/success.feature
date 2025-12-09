Feature: Geração de PDF (Sucesso)

  Background:
    Given o DataService possui uma turma "Engenharia de Software" com id "turma-123"

  Scenario: Gerar ZIP de provas com sucesso e verificar integridade
    Given o DataService possui uma prova "Primeira Prova" com id "100" vinculada à turma "turma-123" contendo 2 questões
    When uma requisição "GET" for enviada para "/api/exams/100/zip" com query params:
      | classId   | quantity |
      | turma-123 | 5        |
    Then o status da resposta deve ser "200"
    And o header "Content-Type" deve ser "application/zip"
    And o header "Content-Disposition" deve conter "attachment; filename="Lote_1_Primeira Prova.zip""
    And o sistema deve registrar uma nova geração no histórico com 5 versões para a prova "100"