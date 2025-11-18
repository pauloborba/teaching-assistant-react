@server
Feature: Server Student Management
  As a system
  I want to manage students through the API
  So that student data is properly stored and retrieved

  Background:
    Given the server API is available

  Scenario: Add a new student without class association via API
    Given there is no student with CPF "98765432100" in the server
    When I send a POST request to create student with:
      | field | value                    |
      | name  | API Test Student         |
      | cpf   | 98765432100             |
      | email | api.test@email.com       |
    Then the server should respond with status 201
    And the server should have stored the student with:
      | field | value                    |
      | name  | API Test Student         |
      | cpf   | 987.654.321-00          |
      | email | api.test@email.com       |
    And I clean up the test student from the server