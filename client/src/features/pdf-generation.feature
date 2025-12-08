@gui
Feature: Geração de PDF de Provas
  Como um professor
  Eu quero configurar e baixar as versões impressas das provas
  Para aplicar avaliações em sala de aula

  Background:
    Given que o professor acessou a gestão de provas da turma "Engenharia de Software e Sistemas-2025-1"

  Scenario: Baixar lote com quantidade padrão
    When ele seleciona a prova "Exame de Requisitos"
    And clica no botão "Baixar Lote"
    Then o modal "Gerar Lote de Provas" deve abrir
    And o campo de quantidade deve sugerir o valor "3" (total de alunos)
    When ele confirma o download
    Then o sistema deve iniciar o download do arquivo "Lote_Exame de Requisitos.zip"
    And o modal deve fechar automaticamente

  Scenario: Validar quantidade mínima de provas
    When ele seleciona a prova "Exame de Requisitos"
    And clica no botão "Baixar Lote"
    And altera a quantidade para "0" ou "-1"
    Then o botão de confirmação "Baixar ZIP" deve estar desabilitado ou exibir erro

  Scenario: Cancelar a geração do lote
    When ele seleciona a prova "Exame de Requisitos"
    And clica no botão "Baixar Lote"
    And clica no botão "Cancelar"
    Then o modal deve fechar sem iniciar download