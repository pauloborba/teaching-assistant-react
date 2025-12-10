@server
Feature: Server Script Management
  As a system
  I want to manage scripts through the API
  So that script data is properly stored and retrieved

  Background:
    Given the scripts API is available

  Scenario: Create a new script via API
    Given there is no script with title "Roteiro API 1" in the server
    When I submit a request to create script with:
      | field       | value                                                    |
      | title       | Roteiro API 1                                           |
      | description | Descrição do Roteiro API 1                              |
      | tasks       | [{"id":"t1","statement":"Task 1"}]                      |
    Then the script request should be accepted successfully
    And the server should have stored the script with:
      | field       | value                                                    |
      | title       | Roteiro API 1                                           |
      | description | Descrição do Roteiro API 1                              |
      | tasks       | [{"id":"t1","statement":"Task 1"}]                      |

  Scenario: Edit an existing script via API
    Given there is no script with title "Roteiro API Edit" in the server
    When I submit a request to create script with:
      | field       | value                                                    |
      | title       | Roteiro API Edit                                        |
      | description | Descrição Original                                       |
      | tasks       | [{"id":"t1","statement":"Task Original"}]               |
    And I submit a request to edit script with:
      | field       | value                                                    |
      | title       | Roteiro API Edit Atualizado                             |
      | description | Descrição Atualizada                                     |
      | tasks       | [{"id":"t2","statement":"Task Atualizada"}]             |
    Then the script request should be accepted successfully
    And the server should have stored the script with:
      | field       | value                                                    |
      | title       | Roteiro API Edit Atualizado                             |
      | description | Descrição Atualizada                                     |
      | tasks       | [{"id":"t2","statement":"Task Atualizada"}]             |
