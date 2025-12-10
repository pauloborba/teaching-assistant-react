@server
Feature: Server Discrepancy
  As a system service
  I want to calculate and report goal discrepancies via functions
  So that frontend and reporting tools can display accurate information

  Background:
    Given the core evaluation service is running
    And the discrepancy threshold is set to 25%
    And all students data is prepared


  Scenario: High Discrepancy Percentage (Above Threshold)
    Given student A data is prepared in the system
    And the calculated discrepancy status for goals 'Configuration Management' and 'Project Management' is TRUE (discrepant)
    And the calculated discrepancy status for the remaining goals is FALSE (not discrepant)
    When the function getStudentDiscrepancyInfo is called for student A
    Then the function should return the total discrepancy percentage as 33%
    And the function should return the overall discrepancy flag as TRUE


  Scenario: Low Discrepancy Percentage (Below Threshold)
    Given student B data is prepared in the system
    And the calculated discrepancy status for goal 'Configuration Management' is TRUE (discrepant)
    And the calculated discrepancy status for the remaining goals is FALSE (not discrepant)
    When the function getStudentDiscrepancyInfo is called for student B
    Then the function should return the total discrepancy percentage as 17%
    And the function should return the overall discrepancy flag as FALSE

  Scenario: Zero Discrepancy Percentage
    Given student C data is prepared in the system
    And the student has no goals marked as discrepant
    When the function getStudentDiscrepancyInfo is called for student C
    Then the function should return the total discrepancy percentage as 0%
    And the function should return the overall discrepancy flag as FALSE

  Scenario: Goal Comparison Returns Discrepant (TRUE)
    Given the goal 'Configuration Management' has teacher evaluation 'MA' and self-evaluation 'MPA'
    When the function compareGoal is called for this goal
    Then the function should return TRUE

  Scenario: Goal Comparison Returns Non-Discrepant (FALSE)
    Given the goal 'Configuration Management' has teacher evaluation 'MPA' and self-evaluation 'MPA'
    When the function compareGoal is called for this goal
    Then the function should return FALSE
