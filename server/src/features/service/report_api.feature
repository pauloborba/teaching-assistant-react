@service @api
Feature: Class Report API

  As an API consumer
  I need the Report endpoint to aggregate student data correctly
  So that the frontend receives pre-calculated statistics

  Background:
    Given the API Controller is ready

  @contract @schema
  Scenario: Response matches the defined JSON Contract
    Given a class exists with ID "SE-101" containing students
    When I request the report for class "SE-101"
    Then the response status should be 200
    And the response body should match the "Report" JSON schema
    And the payload should contain the following root keys:
      | classId               |
      | totalEnrolled         |
      | studentsAverage       |
      | evaluationPerformance |
      | students              |

  @logic @calculation
  Scenario: Aggregation logic correctly counts statuses
    Given the repository returns a class "Math-101" with:
      | Name    | Grades                                | Expected Status |
      | Alice   | MA, MA, MA, MA, MA, MA                | APPROVED        |
      | Bob     | MANA, MANA, MANA, MANA, MANA, MANA    | FAILED          |
      | Charlie | MPA, MPA, MPA                         | PENDING         |
    When I request the report for class "Math-101"
    Then the response status should be 200
    And the aggregated statistics should be:
      | field            | value |
      | totalEnrolled    | 3     |
      | approvedCount    | 1     |
      | notApprovedCount | 1     |
      | pendingCount     | 1     |
      | studentsAverage  | 5.0   |

  @edge-case @pending-logic
  Scenario: Class with students but no evaluations
    Given a class exists with "5" students having "0" evaluations
    When I request the report for this class
    Then the response status should be 200
    And the "studentsAverage" field should be null
    And the "pendingCount" should equal "5"
    And the "evaluationPerformance" list should be empty

  @edge-case @empty-class
  Scenario: Class with zero enrolled students
    Given a class exists with "0" students
    When I request the report for this class
    Then the response status should be 200
    And the "totalEnrolled" field should be 0
    And the "students" list should be empty

  @error
  Scenario: Requesting a non-existent class ID
    Given the repository finds no class with ID "ghost-class-404"
    When I request the report for class "ghost-class-404"
    Then the response status should be 404
    And the error message should indicate "Class not found"