Feature: Geração de Lote de Provas

  Scenario: Gerar ZIP de provas com sucesso
    Given o DataService possui uma prova "Prova 100" vinculada à turma "turma-123"
    When uma requisição "GET" for enviada para "/api/exams/100/zip" com query params:
      | classId  | turma-123 |
      | quantity | 5         |
    Then o status da resposta deve ser "200"
    And o header "Content-Type" deve ser "application/zip"