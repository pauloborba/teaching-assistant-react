@gui
Feature: Importação de Notas
  Como um professor do sistema
  Eu quero importar notas de um CSV para a minha turma
  Para que eu possa consolidar o desempenho da minha turma

  Background:
    Dado que o sistema de importação de notas está funcionando
    E o servidor está disponível
    E existe uma turma "Engenharia de Software e Sistemas-2025-1" com alunos matriculados

  Scenario: Upload de arquivo CSV com sucesso e visualização de mapeamento
    Dado que estou na página de Avaliações
    E selecionei a turma "Engenharia de Software e Sistemas-2025-1"
    Quando seleciono um arquivo CSV "import_grade_1.csv" para upload
    E clico no botão continuar
    Então devo ver a interface de mapeamento de colunas
    E devo ver as colunas do arquivo CSV carregado
    E devo ver as colunas de metas para mapeamento

  Scenario: Mapear colunas e importar notas com sucesso
    Dado que estou na página de Avaliações
    E selecionei a turma "Engenharia de Software e Sistemas-2025-1"
    E fiz upload de um arquivo CSV com dados válidos
    E estou na etapa de mapeamento de colunas
    Quando mapeio as colunas corretamente:
      | coluna_arquivo            | coluna_meta               |
      | cpf                       | cpf                       |
      | Requirements              | Requirements              |
      | Configuration Management  | Configuration Management  |
      | Project Management        | Project Management        |
    E clico no botão enviar mapeamento
    Então as notas devem ser importadas com sucesso
    E devo ver as avaliações atualizadas na tabela

  Scenario: Voltar do mapeamento para seleção de arquivo
    Dado que estou na página de Avaliações
    E selecionei a turma "Engenharia de Software e Sistemas-2025-1"
    E fiz upload de um arquivo CSV
    E estou na etapa de mapeamento de colunas
    Quando clico no botão voltar
    Então devo retornar para a etapa de upload de arquivo
    E o mapeamento deve ser limpo

