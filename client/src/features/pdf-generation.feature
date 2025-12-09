@pdf-only
Feature: Geração de PDF de Provas
  Como um professor
  Eu quero baixar as versões impressas das provas
  Para aplicar avaliações em sala de aula

  Background:
    Given que o professor está gerenciando a turma "Engenharia de Software e Sistemas-2025-1"

  Scenario: Baixar lote de provas com sucesso
    When ele solicita a geração do lote da prova "Exame de Requisitos" para "3" alunos
    Then o sistema deve iniciar o download do arquivo "Lote_Exame de Requisitos.zip"
    And a interface deve retornar ao estado inicial

  Scenario: Validação de quantidade inválida
    When ele tenta gerar o lote da prova "Exame de Requisitos" com quantidade "0"
    Then o sistema deve impedir o prosseguimento da ação
    And deve sinalizar que o valor é inválido

  Scenario: Cancelamento da operação
    When ele inicia a configuração da prova "Exame de Requisitos" mas desiste
    Then nenhum download deve ser iniciado
    And a interface deve retornar ao estado inicial