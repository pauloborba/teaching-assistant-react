@pdf-only
Feature: Geração de PDF de Provas
  Como um professor
  Eu quero baixar as versões impressas das provas em lote
  Para aplicar avaliações presenciais de forma eficiente

  Background:
    Given que o professor está gerenciando a turma "Engenharia de Software e Sistemas-2025-1"
    And a prova "Exame de Requisitos" já foi criada e está disponível na lista

  Scenario: Baixar lote com quantidade sugerida baseada na turma
    Given a turma possui "3" alunos matriculados
    When ele seleciona a prova "Exame de Requisitos"
    And solicita a geração do lote
    Then o sistema deve sugerir a quantidade "3" para impressão
    When ele confirma o download
    Then o sistema deve iniciar o download do arquivo "Lote_Exame de Requisitos.zip"
    And a operação deve ser concluída com sucesso

  Scenario: Validar integridade ao alterar quantidade manualmente
    Given a turma possui "3" alunos matriculados
    When ele seleciona a prova "Exame de Requisitos"
    And solicita a geração do lote
    And altera a quantidade de cópias para "5"
    And confirma o download
    Then o sistema deve iniciar o download do arquivo "Lote_Exame de Requisitos.zip"
    And nenhuma mensagem de erro deve ser exibida

  Scenario: Cancelar a operação mantém o estado anterior
    When ele seleciona a prova "Exame de Requisitos"
    And solicita a geração do lote
    And decide cancelar a operação
    Then nenhum download deve ser iniciado
    And o sistema deve retornar ao estado inicial da listagem
    And a prova "Exame de Requisitos" deve continuar selecionada

  @unit
  Scenario: Verificar interatividade do componente de botão
    Given ele seleciona a prova "Exame de Requisitos"
    And o botão "Gerar Lote" deve estar visível e habilitado
    When ele clica no botão "Gerar Lote"
    Then o modal com título "Gerar Lote de Provas" deve ser exibido