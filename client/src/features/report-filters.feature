@gui-report
Feature: Report Filters via GUI

  Background:
    Given a class exists with name "Math" for GUI testing
    And the following students have evaluations for the GUI test:
      | name  | cpf         | gradeType |
      | Maria | 11122233344 | MA        |
      | John  | 22233344455 | MANA      |
      | Ana   | 33344455566 | MPA       |

  @gui
  Scenario: Professor filters students below class average
    Given I am on the home page
    And I navigate to the "Classes" section
    When I click on the report button for the class "Math"
    Then the student table should show exactly 3 students
    
    When I select "Below Class Average" in the filter dropdown
    Then the student table should show exactly 1 student
    And the student "John" should be visible in the list
    And the student "Maria" should NOT be visible in the list

  @gui
  Scenario: Professor filters approved students
    Given I am on the home page
    And I navigate to the "Classes" section
    When I click on the report button for the class "Math"
    
    When I select "Approved" in the filter dropdown
    Then the student table should show exactly 2 students
    And the student "Maria" should be visible in the list
    And the student "Ana" should be visible in the list
    And the student "John" should NOT be visible in the list

  @gui
  Scenario: Professor filters students below specific custom grade
    Given I am on the home page
    And I navigate to the "Classes" section
    When I click on the report button for the class "Math"
    
    When I select "Below specific grade..." in the filter dropdown
    And I set the threshold value to 5.0
    Then the student table should show exactly 1 student
    And the student "John" should be visible in the list