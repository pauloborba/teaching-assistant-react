@discrepancy
Feature: Discrepancy Visualization
  As a professor
  I want to view students’ evaluations, self-evaluations, and discrepancies
  So that I can clearly identify mismatches and highlight students who require attention  

  Background:
    Given the system is running
    And I am authenticated as a professor
    And all evaluations and self-evaluations have been loaded

  Scenario: Visualization without Discrepancies
    Given I am on the self-evaluation page
    And Turma1 is selected
    And there are no students with self-evaluation discrepancies
    When the student list is displayed
    Then I should see the student list without any discrepancy markings

  Scenario: Visualization with Discrepancies for Some Students
    Given I am on the self-evaluation page
    And Turma2 is selected
    And students A and B have goals where their self-evaluations are higher than the teacher’s evaluations
    When the student list is displayed
    Then I should see the student list with discrepancy markings on the discrepant goals of students A and B

  Scenario: Detailing the Discrepant Self-Evaluation Goal
    Given I am on the self-evaluation page
    And Turma2 is selected
    And student A has the "Requirements" goal highlighted as discrepant
    When I view the goal details
    Then I should see the teacher’s evaluation for that goal

  Scenario: Score comparison of a student without discrepancies
    Given I am on the comparison page
    And Turma1 is selected
    And student A has no discrepancies
    When the student list is displayed
    Then I should see the student, their evaluations, and self-evaluations, all without highlighting

  Scenario: Student with More than 25% Discrepancy
    Given I am on the comparison page
    And Turma2 is selected
    And student A has more than 25% of goals marked as discrepant
    When the student list is displayed
    Then I should see the student highlighted, along with their evaluations and highlighted self-evaluations

  Scenario: Student with less than 25% discrepancy
    Given I am on the comparison page
    And Turma2 is selected
    And student B has less than 25% of goals marked as discrepant
    When the student list is displayed
    Then I should see the evaluations and the highlighted self-evaluations, but the student B should not be highlighted

  Scenario: Viewing discrepancy details of a student
    Given I am on the comparison page
    And Turma2 is selected
    And student A has a discrepancy marking
    When I view student A's details
    Then I should see the discrepancy percentage