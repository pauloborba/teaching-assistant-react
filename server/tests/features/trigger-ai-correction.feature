Feature: Trigger AI Correction API

  Scenario: Iniciar correção AI com sucesso
    Given existe um exame com id "1" contendo questões abertas e respostas registradas
    And o QStash está configurado corretamente
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo examId "1" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "200"
    And o JSON da resposta deve conter message "Correção iniciada com sucesso"
    And o JSON da resposta deve conter estimatedTime
    And o JSON da resposta deve conter totalResponses maior que 0
    And o JSON da resposta deve conter totalOpenQuestions maior que 0
    And o JSON da resposta deve conter queuedMessages maior que 0

  Scenario: Falhar ao iniciar correção quando examId não é fornecido
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo apenas model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter error "examId e model são obrigatórios"

  Scenario: Falhar ao iniciar correção quando model não é fornecido
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo apenas examId "1"
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter error "examId e model são obrigatórios"

  Scenario: Falhar ao iniciar correção quando model é inválido
    Given existe um exame com id "1" contendo questões abertas e respostas registradas
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo examId "1" e model "gpt-4"
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter error "Modelo inválido. Apenas Gemini 2.5 Flash é suportado"

  Scenario: Falhar ao iniciar correção quando não existem respostas para o exame
    Given não existem respostas registradas para o exame de id "999"
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo examId "999" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "404"
    And o JSON da resposta deve conter error "Nenhuma resposta encontrada para este exame"

  Scenario: Falhar ao iniciar correção quando QStash não está configurado
    Given existe um exame com id "1" contendo questões abertas e respostas registradas
    And o QStash não está configurado
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo examId "1" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "500"
    And o JSON da resposta deve conter error "QStash não está configurado. Configure o QSTASH_TOKEN no arquivo .env"

  Scenario: Falhar ao iniciar correção quando não existem questões abertas
    Given existe um exame com id "2" sem questões abertas ou sem respostas abertas
    And o QStash está configurado corretamente
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo examId "2" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "400"
    And o JSON da resposta deve conter error "Nenhuma questão aberta encontrada para este exame"

  Scenario: Falhar ao iniciar correção quando ocorre erro ao enviar mensagens para QStash
    Given existe um exame com id "1" contendo questões abertas e respostas registradas
    And o QStash está configurado corretamente
    And o QStash falha ao processar publishBatch
    When uma requisição "POST" for enviada para "/api/trigger-ai-correction" com body contendo examId "1" e model "Gemini 2.5 Flash"
    Then o status da resposta deve ser "500"
    And o JSON da resposta deve conter error "Erro ao enviar mensagens para QStash"
    And o JSON da resposta deve conter details
