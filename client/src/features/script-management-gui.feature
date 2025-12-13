@gui
Feature: Script Management
  As a professor
  I want to create and edit scripts
  So that I can manage script information

  Background:
    Given the script management system is running

  Scenario: Create a new script successfully
    Given there is no script with title "Roteiro 1" in the system
    When I navigate to the Scripts area
    And I provide the script information:
      | field       | value                                                    |
      | title       | Roteiro 1                                               |
      | description | Descrição do Roteiro 1                                  |
      | tasks       | [{"id":"t1","statement":"Task 1"}]                      |
    And I send the script information
    Then I should see "Roteiro 1" in the script list
    And the script should have description "Descrição do Roteiro 1"
