Feature: Gerenciamento de Roteiros
  As a professor
  I want to gerenciar os roteiros de estudo
  So that eu possa organizar as atividades de aprendizagem para os alunos

  Background:
    Given que estou autenticado como professor "pcosv"
    And que a turma "ESS - 2026.2" está cadastrada
    And que estou na página de gerenciamento de roteiros

     # --- INSERÇÃO ---

  Scenario: Inserir um novo roteiro completo com sucesso
    Given que não existe roteiro "Tutorial de Git" na turma "ESS - 2026.2"
    When eu insiro o roteiro com os seguintes dados:
      | título           | Tutorial de Git                                      |
      | descrição        | Prática de versionamento com commits, branches e merge |
      | turma            | ESS - 2026.2                                         |
      | data de abertura | 10/11/2026                                           |
      | prazo de entrega | 17/11/2026                                           |
      | atividades       | Criar repositório; Criar branch; Resolver conflito   |
    Then devo ver uma mensagem de sucesso
    And o roteiro "Tutorial de Git" está armazenado na turma "ESS - 2026.2"
    And ele tem o prazo de entrega "17/11/2026" e 3 atividades

  Scenario: Inserir roteiro sem título, com os demais dados preenchidos
    Given que a turma "ESS - 2026.2" tem apenas o roteiro "Introdução ao GitHub"
    When eu tento inserir um roteiro sem título, com descrição "Prática de commits"
      e prazo de entrega "17/11/2026"
    Then devo ver uma mensagem de erro sobre a obrigatoriedade do título
    And a turma "ESS - 2026.2" continua com apenas o roteiro "Introdução ao GitHub"

  Scenario: Inserir roteiro com prazo anterior à data de abertura
    When eu tento inserir o roteiro "Tutorial de Git" com data de abertura "17/11/2026"
      e prazo de entrega "10/11/2026"
    Then devo ver uma mensagem de erro sobre prazo inválido
    And o roteiro "Tutorial de Git" não está armazenado no sistema

  Scenario: Inserir roteiro com título já existente na mesma turma
    Given que a turma "ESS - 2026.2" tem o roteiro "Tutorial de Git"
    When eu tento inserir outro roteiro "Tutorial de Git" na turma "ESS - 2026.2"
    Then devo ver uma mensagem de erro sobre título duplicado
    And a turma "ESS - 2026.2" continua com apenas um roteiro "Tutorial de Git"

    # --- ATUALIZAÇÃO ---

  Scenario: Atualizar prazo e atividades preservando os demais dados
    Given que existe o roteiro "Tutorial de Git" com prazo "17/11/2026"
      e atividades "Criar repositório" e "Criar branch"
    When eu altero o prazo do roteiro "Tutorial de Git" para "24/11/2026"
      e adiciono a atividade "Resolver conflito"
    Then devo ver uma mensagem de sucesso
    And o roteiro "Tutorial de Git" tem prazo "24/11/2026" e 3 atividades
    And o título e a descrição do roteiro "Tutorial de Git" continuam os mesmos

  Scenario: Atualizar o título de um roteiro
    Given que existe o roteiro "Tutorial de Git"
    When eu altero o título do roteiro "Tutorial de Git" para "Tutorial Avançado de Git"
    Then o roteiro "Tutorial Avançado de Git" está armazenado
    And o roteiro "Tutorial de Git" não está mais armazenado

  Scenario: Atualizar um roteiro removendo o título
    Given que existe o roteiro "Tutorial de Git"
    When eu tento alterar o título do roteiro "Tutorial de Git" para vazio
    Then devo ver uma mensagem de erro sobre a obrigatoriedade do título
    And o roteiro continua com o título "Tutorial de Git"

  Scenario: Atualizar roteiro usando título já existente
    Given que a turma "ESS - 2026.2" tem os roteiros "Tutorial de Git"
      e "Introdução ao GitHub"
    When eu tento alterar o título do roteiro "Introdução ao GitHub" para "Tutorial de Git"
    Then devo ver uma mensagem de erro sobre título duplicado
    And o roteiro "Introdução ao GitHub" continua com o título "Introdução ao GitHub"

     # --- REMOÇÃO ---

  Scenario: Remover roteiro sem respostas de alunos
    Given que existe o roteiro "Tutorial de Git" com 3 atividades e sem respostas de alunos
    When eu solicito a exclusão do roteiro "Tutorial de Git"
    And eu confirmo a exclusão
    Then devo ver uma mensagem de sucesso
    And o roteiro "Tutorial de Git" não está mais armazenado

  Scenario: Cancelar a exclusão de um roteiro
    Given que existe o roteiro "Tutorial de Git" sem respostas de alunos
    When eu solicito a exclusão do roteiro "Tutorial de Git"
    And eu posteriormente cancelo a exclusão
    Then o roteiro "Tutorial de Git" continua armazenado

  Scenario: Remover roteiro que possui respostas de alunos
    Given que existe o roteiro "Tutorial de Git" com respostas dos alunos "Mariana" e "Pedro"
    When eu solicito a exclusão do roteiro "Tutorial de Git"
    Then devo ver uma mensagem de erro informando que o roteiro possui respostas
    And o roteiro "Tutorial de Git" continua armazenado
    And as respostas de "Mariana" e "Pedro" continuam armazenadas