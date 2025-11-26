@gui
Feature: Importação de Notas
  As a professor do sistema
  I want to importar notas de um CSV para a minha turma
  So that eu possa consolidar o desempenho da minha turma

  Scenario: Upload de arquivo CSV com sucesso e visualização de mapeamento
    Given estou na página de Avaliações
    And selecionei a turma "Engenharia de Software e Sistemas-2025-1"
    When seleciono um arquivo CSV "import_grade_1.csv" para upload
    And clico no botão continuar
    Then devo ver a interface de mapeamento de colunas
    And devo ver as colunas do arquivo CSV carregado
    And devo ver as colunas de metas para mapeamento

  Scenario: Mapear colunas e importar notas com sucesso
    Given estou na página de Avaliações
    And selecionei a turma "Engenharia de Software e Sistemas-2025-1"
    And fiz upload de um arquivo CSV com dados válidos
    And estou na etapa de mapeamento de colunas
    When mapeio as colunas corretamente:
      | coluna_arquivo            | coluna_meta               |
      | cpf                       | cpf                       |
      | Requirements              | Requirements              |
      | Configuration Management  | Configuration Management  |
      | Project Management        | Project Management        |
    And clico no botão enviar mapeamento
    Then as notas devem ser importadas com sucesso
    And devo ver as avaliações atualizadas na tabela

  Scenario: Voltar do mapeamento para seleção de arquivo
    Given estou na página de Avaliações
    And selecionei a turma "Engenharia de Software e Sistemas-2025-1"
    And fiz upload de um arquivo CSV
    And estou na etapa de mapeamento de colunas
    When clico no botão voltar
    Then devo retornar para a etapa de upload de arquivo
    And o mapeamento deve ser limpo
