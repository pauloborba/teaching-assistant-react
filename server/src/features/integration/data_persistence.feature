@integration @persistence
Feature: Data Persistence & Consistency

  As a Backend Engineer
  I need data changes (Writes) to be immediately available to API queries (Reads)
  So that the reports reflect the real-time state of the database

  Background:
    Given the API is connected to the Test Database
    And a fresh class "Integration-101" exists

  @write-read
  Scenario: New student enrollment updates the report total
    Given the class "Integration-101" has exactly "2" existing students
    When I enroll a new student with CPF "999.999.999-99"
    And I request the report for "Integration-101"
    Then the "totalEnrolled" count should be 3

  @deletion
  Scenario: Unenrolling a student removes them from the report
    Given the class "Integration-101" has the following students:
      | Name      | CPF             |
      | Student A | 111.111.111-11  |
      | Student B | 222.222.222-22  |
      | Student C | 333.333.333-33  |
    When I unenroll the student "333.333.333-33"
    And I request the report for "Integration-101"
    Then the "totalEnrolled" count should be 2
    And the student "Student C" should NOT be present in the list

  @update @logic
  Scenario: Updating a grade changes the calculated status
    Given the class "Integration-101" has a student "Grade Tester"
    And "Grade Tester" has the grades:
      | Requirements              | MA   |
      | Configuration Management  | MA   |
      | Project Management        | MA   |
      | Design                    | MANA |
      | Tests                     | MA   |
      | Refactoring               | MA   |
    When I update "Grade Tester" grade for "Design" to "MA"
    And I request the report for "Integration-101"    
    Then "Grade Tester" should have status "APPROVED"
    And the "approvedCount" should be 1

  @integrity @sequence
  Scenario: Multiple add/remove operations maintain correct count
    Given the class "Integration-101" is empty
    When I perform the following operations in order:
      | Action   | Student Name | CPF            |
      | Enroll   | Alice        | 100.000.000-01 |
      | Enroll   | Bob          | 200.000.000-02 |
      | Enroll   | Charlie      | 300.000.000-03 |
      | Unenroll | -            | 200.000.000-02 |
    And I request the report for "Integration-101"
    Then the "totalEnrolled" count should be 2
    And the list should contain "Alice" and "Charlie"
    And the list should NOT contain "Bob"