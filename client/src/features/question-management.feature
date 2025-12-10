@gui
Feature: Question Management
  As a professor
  I want to manage question templates
  So that I can reuse them when assembling exams

  Background:
    Given the student management system is running
    And the server is available
    And I navigate to the Questions area

  Scenario: Create a new open question
    Given there is no question with text "Qual é o objetivo do TDD?" in the system
    When I fill the question form with:
      | field    | value                                     |
      | question | Qual é o objetivo do TDD?                 |
      | topic    | Engenharia de Software                    |
      | type     | open                                      |
      | answer   | Garantir feedback rápido e código limpo.  |
    And I submit the question form
    Then I should see "Qual é o objetivo do TDD?" in the question bank list

  Scenario: Create a new closed question
    Given there is no question with text "Qual é a sigla de Test-Driven Development?" in the system
    When I fill the question form with:
      | field      | value                              |
      | question   | Qual é a sigla de Test-Driven Development? |
      | topic      | Testes Automatizados              |
      | type       | closed                            |
      | option1    | TBD                               |
      | option2    | TDD                               |
      | correct    | 2                                 |
    And I submit the question form
    Then I should see "Qual é a sigla de Test-Driven Development?" in the question bank list

  Scenario: Delete an existing question
    Given there is no question with text "Questão temporária para exclusão" in the system
    When I fill the question form with:
      | field    | value                             |
      | question | Questão temporária para exclusão  |
      | topic    | Fluxo de Trabalho                 |
      | type     | open                              |
      | answer   | Usada apenas para testar exclusão |
    And I submit the question form
    And I delete the question "Questão temporária para exclusão"
    Then I should not see "Questão temporária para exclusão" in the question bank list
