Feature: Trigger AI Correction API

  Scenario: Falhar ao iniciar correção quando classId não é fornecido
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo apenas model "gemini-2.5-flash"
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter error "Class ID and model are required"

