Feature: Importação e Avaliação de Roteiros
  Como professor
  Eu quero gerenciar avaliações de roteiros
  Para acompanhar o desempenho dos alunos em atividades práticas

  Background:
    Given que existem estudantes cadastrados no sistema
    And existe uma turma "Engenharia de Software e Sistemas (2025/1)"
    And os estudantes estão matriculados na turma

  Scenario: Alternar entre visualização de Avaliações Gerais e Roteiros
    Given estou na aba "Evaluations"
    And selecionei a turma "Engenharia de Software e Sistemas (2025/1)"
    When visualizo a interface de avaliações
    Then devo ver o botão "📊 Avaliações Gerais" ativo
    And devo ver o botão "📝 Roteiros"
    And a tabela deve exibir colunas: "Requirements", "Configuration Management", "Design", "Tests", "Refactoring", "Project Management"
    When clico no botão "📝 Roteiros"
    Then o botão "📝 Roteiros" deve ficar ativo
    And a tabela deve exibir colunas: "Roteiro 1", "Roteiro 2", "Roteiro 3", "Roteiro 4", "Roteiro 5", "Roteiro 6"

  Scenario: Avaliar roteiro manualmente
    Given estou na aba "Evaluations"
    And selecionei a turma "Engenharia de Software e Sistemas (2025/1)"
    And cliquei no botão "📝 Roteiros"
    When seleciono o conceito "MA" para o aluno "Paulo Borba" no "Roteiro 1"
    Then o conceito "MA" deve ser salvo
    And deve aparecer na célula do aluno "Paulo Borba" no "Roteiro 1"

  Scenario: Importar notas de roteiros via CSV
    Given estou na aba "Evaluations"
    And selecionei a turma "Engenharia de Software e Sistemas (2025/1)"
    And cliquei no botão "📝 Roteiros"
    When clico em "Escolher arquivo" na seção "Importar Notas de Roteiros"
    And seleciono o arquivo CSV com notas de roteiros
    And clico em "Continuar"
    Then devo ver a interface de mapeamento de colunas
    And as colunas disponíveis devem incluir: "Roteiro 1", "Roteiro 2", "Roteiro 3", "Roteiro 4", "Roteiro 5", "Roteiro 6"
    When mapeio as colunas corretamente
    And clico em "Enviar"
    Then as notas dos roteiros devem ser importadas
    And devo ver as notas na tabela de roteiros

  Scenario: Importar roteiros sem sobrescrever avaliações existentes
    Given estou na aba "Evaluations"
    And selecionei a turma "Engenharia de Software e Sistemas (2025/1)"
    And cliquei no botão "📝 Roteiros"
    And o aluno "Paulo Borba" já tem conceito "MANA" no "Roteiro 1"
    When importo um CSV com conceito "MA" para o aluno "Paulo Borba" no "Roteiro 1"
    Then o conceito do aluno "Paulo Borba" no "Roteiro 1" deve permanecer "MANA"

  Scenario: Validar que apenas conceitos válidos são aceitos em roteiros
    Given estou na aba "Evaluations"
    And selecionei a turma "Engenharia de Software e Sistemas (2025/1)"
    And cliquei no botão "📝 Roteiros"
    When tento selecionar um conceito diferente de "MANA", "MPA" ou "MA" para um roteiro
    Then apenas os conceitos válidos devem estar disponíveis no dropdown
    And o conceito deve ser um de: "-", "MANA", "MPA", "MA"

  Scenario: Limpar avaliação de roteiro
    Given estou na aba "Evaluations"
    And selecionei a turma "Engenharia de Software e Sistemas (2025/1)"
    And cliquei no botão "📝 Roteiros"
    And o aluno "Paulo Borba" tem conceito "MA" no "Roteiro 2"
    When seleciono "-" (vazio) para o aluno "Paulo Borba" no "Roteiro 2"
    Then a avaliação do "Roteiro 2" deve ser removida
    And a célula deve mostrar "-"

  Scenario: Visualizar roteiros e avaliações gerais independentemente
    Given estou na aba "Evaluations"
    And selecionei a turma "Engenharia de Software e Sistemas (2025/1)"
    And o aluno "Paulo Borba" tem avaliações em "Requirements" e "Roteiro 1"
    When visualizo "📊 Avaliações Gerais"
    Then devo ver apenas a coluna "Requirements" e não "Roteiro 1"
    When clico no botão "📝 Roteiros"
    Then devo ver apenas a coluna "Roteiro 1" e não "Requirements"

  Scenario: Importar notas gerais e roteiros em sessões separadas
    Given estou na aba "Evaluations"
    And selecionei a turma "Engenharia de Software e Sistemas (2025/1)"
    When importo um CSV com avaliações gerais na seção "Importar Notas Gerais"
    Then as notas gerais devem ser importadas
    When clico no botão "📝 Roteiros"
    And importo um CSV com avaliações de roteiros na seção "Importar Notas de Roteiros"
    Then as notas dos roteiros devem ser importadas
    And ambas as importações devem coexistir no sistema
