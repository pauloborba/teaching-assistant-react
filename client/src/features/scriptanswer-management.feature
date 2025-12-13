@gui
Feature: Script Answer Management
  As a professor
  I want to grade and comment on student script answers
  So that I can provide feedback on their submissions

  Background:
    Given the student management system is running
    And the server is available

  # ==========================================
  # Editing both grade and comment
  # ==========================================

  Scenario: Edit both grade and comment of a task in a script answer
    Given there is a script answer with ID "50" 
    And this answer contains a task with ID "3"
    And I am in the Script Grading area
    And I select the script answer with ID "50"
    And I see the task with ID "3"
    When I change the grade to "MPA"
    And I change the comment to "Great improvement!"
    And I save all task updates
    Then I should see the grade of task "3" updated to "MPA"
    And I should see the comment of task "3" updated to "Great improvement!"
