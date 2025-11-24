@gui
Feature: Student Management
  As a professor
  I want to add students to the system
  So that I can manage student information

  Background:
    Given the student management system is running
    And the server is available

  Scenario: Add a new student without class association
    Given there is no student with CPF "12345678901" in the system
    When I navigate to the Students area
    And I provide the student information:
      | field | value                    |
      | name  | Test Student             |
      | cpf   | 12345678901             |
      | email | test.student@email.com   |
    And I send the student information
    Then I should see "Test Student" in the student list
    And the student should have CPF "123.456.789-01"
    And the student should have email "test.student@email.com"