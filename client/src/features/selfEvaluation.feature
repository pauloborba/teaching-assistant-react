Feature: Self-Evaluation
  As a student
  I want to submit my self-evaluations for a class
  So that I can assess my own performance on different goals

  Background:
    Given the server is running on "http://localhost:3005"
    And the client is running on "http://localhost:3004"
    And a student with CPF "123.456.789-00", name "João Silva" and email "joao.silva@gmail.com" exists
    And a class "Software Engineering" exists for semester "1" and year "2025"
    And the student "123.456.789-00" is enrolled in class "Software Engineering"

  @authentication @parametrized
  Scenario Outline: Student searches with different credentials
    Given a student with CPF "987.654.321-00", name "Maria Santos" and email "maria.santos@gmail.com" exists
    And I am on the self-evaluation tab
    When I have searched with email "<email>" and CPF "<cpf>"
    Then <expected_result>

    Examples:
      | email                      | cpf              | expected_result                                                       |
      | joao.silva@gmail.com       | 123.456.789-00   | I should see a class selection dropdown                               |
      | joao.silva@gmail.com       | 999.999.999-99   | I should see an error message containing "Student not found"          |
      | wrong.email@gmail.com      | 123.456.789-00   | I should see an error message containing "email provided does not match" |
      | maria.santos@gmail.com     | 987.654.321-00   | I should see a message containing "not enrolled in any classes"       |

  @viewing
  Scenario: Student views all evaluation goals
    Given I am on the self-evaluation tab
    And I have searched with email "joao.silva@gmail.com" and CPF "123.456.789-00"
    When I select the class "Software Engineering (2025/1)"
    Then I should see the evaluation goals table
    And I should see the following goals:
      | goal                     |
      | Requirements             |
      | Configuration Management |
      | Project Management       |
      | Design                   |
      | Tests                    |
      | Refactoring              |

  @grading @parametrized
  Scenario Outline: Student selects grade for a goal
    Given I am on the self-evaluation tab
    And I have searched with email "joao.silva@gmail.com" and CPF "123.456.789-00"
    And I have selected the class "Software Engineering (2025/1)"
    When I select "<grade>" for goal "<goal>"
    Then the grade for "<goal>" should be "<grade>"

    Examples:
      | goal                     | grade |
      | Requirements             | MA    |
      | Configuration Management | MPA   |
      | Project Management       | MANA  |
      | Design                   | MA    |
      | Tests                    | MPA   |
      | Refactoring              | MANA  |

  @grading @update
  Scenario: Student changes self-evaluation grade
    Given I am on the self-evaluation tab
    And I have searched with email "joao.silva@gmail.com" and CPF "123.456.789-00"
    And I have selected the class "Software Engineering (2025/1)"
    And I have selected "MA" for goal "Design"
    When I select "MPA" for goal "Design"
    Then the grade for "Design" should be "MPA"

  @grading @removal
  Scenario: Student removes self-evaluation by selecting empty option
    Given I am on the self-evaluation tab
    And I have searched with email "joao.silva@gmail.com" and CPF "123.456.789-00"
    And I have selected the class "Software Engineering (2025/1)"
    And I have selected "MA" for goal "Tests"
    When I select "-" for goal "Tests"
    Then the grade for "Tests" should be "-"

  @persistence
  Scenario: Self-evaluation persists after page reload
    Given I am on the self-evaluation tab
    And I have searched with email "joao.silva@gmail.com" and CPF "123.456.789-00"
    And I have selected the class "Software Engineering (2025/1)"
    And I have selected "MA" for goal "Requirements"
    When I reload the page
    And I have searched with email "joao.silva@gmail.com" and CPF "123.456.789-00"
    And I select the class "Software Engineering (2025/1)"
    Then the grade for "Requirements" should be "MA"

  @validation @button-state
  Scenario Outline: Search button disabled with incomplete fields
    Given I am on the self-evaluation tab
    When I enter "<email>" in the email field
    And I enter "<cpf>" in the CPF field
    Then the "Search" button should be disabled

    Examples:
      | email                      | cpf              |
      |                            | 123.456.789-00   |
      | joao.silva@gmail.com     |                  |
      |                            |                  |

  @edge-case @cpf-format
  Scenario: Student searches with CPF without formatting
    Given I am on the self-evaluation tab
    When I have searched with email "joao.silva@gmail.com" and CPF "12345678900"
    Then I should see a class selection dropdown
    And the dropdown should contain the class "Software Engineering (2025/1)"

  @multiple-classes
  Scenario: Student enrolled in multiple classes
    Given a student with CPF "111.222.333-44", name "Carlos Oliveira" and email "carlos.oliveira@gmail.com" exists
    And a class "Data Structures" exists for semester "1" and year "2025"
    And the student "111.222.333-44" is enrolled in class "Software Engineering"
    And the student "111.222.333-44" is enrolled in class "Data Structures"
    And I am on the self-evaluation tab
    When I have searched with email "carlos.oliveira@gmail.com" and CPF "111.222.333-44"
    Then I should see a class selection dropdown
    And the dropdown should contain the class "Software Engineering (2025/1)"
    And the dropdown should contain the class "Data Structures (2025/1)"

  @multiple-classes @switching
  Scenario: Student switches between multiple classes and evaluations are isolated
    Given a student with CPF "111.222.333-44", name "Carlos Oliveira" and email "carlos.oliveira@gmail.com" exists
    And a class "Data Structures" exists for semester "1" and year "2025"
    And the student "111.222.333-44" is enrolled in class "Software Engineering"
    And the student "111.222.333-44" is enrolled in class "Data Structures"
    And I am on the self-evaluation tab
    And I have searched with email "carlos.oliveira@gmail.com" and CPF "111.222.333-44"
    When I select the class "Software Engineering (2025/1)"
    And I select "MA" for goal "Requirements"
    And I select the class "Data Structures (2025/1)"
    And I select "MPA" for goal "Requirements"
    And I select the class "Software Engineering (2025/1)"
    Then the grade for "Requirements" should be "MA"

  @grading @complete
  Scenario: Student submits evaluation for all goals
    Given I am on the self-evaluation tab
    And I have searched with email "joao.silva@gmail.com" and CPF "123.456.789-00"
    And I have selected the class "Software Engineering (2025/1)"
    When I submit the following self-evaluations:
      | goal                     | grade |
      | Requirements             | MA    |
      | Configuration Management | MA    |
      | Project Management       | MPA   |
      | Design                   | MA    |
      | Tests                    | MPA   |
      | Refactoring              | MA    |
    Then I should see the following self-evaluations saved:
      | goal                     | grade |
      | Requirements             | MA    |
      | Configuration Management | MA    |
      | Project Management       | MPA   |
      | Design                   | MA    |
      | Tests                    | MPA   |
      | Refactoring              | MA    |

  @grading @clear-all
  Scenario: Student clears all self-evaluations
    Given I am on the self-evaluation tab
    And I have searched with email "joao.silva@gmail.com" and CPF "123.456.789-00"
    And I have selected the class "Software Engineering (2025/1)"
    And I have selected "MA" for goal "Requirements"
    And I have selected "MPA" for goal "Configuration Management"
    And I have selected "MA" for goal "Project Management"
    And I have selected "MPA" for goal "Design"
    And I have selected "MA" for goal "Tests"
    And I have selected "MPA" for goal "Refactoring"
    When I submit the following self-evaluations:
      | goal                     | grade |
      | Requirements             | -     |
      | Configuration Management | -     |
      | Project Management       | -     |
      | Design                   | -     |
      | Tests                    | -     |
      | Refactoring              | -     |
    Then I should see the following self-evaluations saved:
      | goal                     | grade |
      | Requirements             | -     |
      | Configuration Management | -     |
      | Project Management       | -     |
      | Design                   | -     |
      | Tests                    | -     |
      | Refactoring              | -     |
