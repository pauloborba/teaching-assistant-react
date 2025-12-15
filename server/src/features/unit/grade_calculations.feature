@unit
Feature: Grade Calculations - Domain Logic

  As a Domain Developer
  I need to perform accurate grade calculations
  So that student performance is correctly evaluated

  @average
  Scenario: Calculate average ignoring null values
    Given I have a list of grades with values [10, null, 5]
    When I calculate the grade average
    Then the result should be 7.5

  @average @edge-case
  Scenario: Calculate average returns 0 for empty grade list
    Given I have an empty list of grades
    When I calculate the grade average
    Then the result should be 0

  @grouping
  Scenario: Group students by status correctly
    Given I have a list of students with statuses:
      | name    | status   |
      | Alice   | APPROVED |
      | Bob     | APPROVED |
      | Charlie | FAILED   |
    When I aggregate the student statuses
    Then the grouping should return:
      | status   | count |
      | APPROVED | 2     |
      | FAILED   | 1     |

  @conversion
  Scenario Outline: Convert grade acronym to numeric value
    Given I have a grade acronym "<acronym>"
    When I convert it to a numeric value
    Then the result should be <value>

    Examples:
      | acronym | value |
      | MA      | 10    |
      | MPA     | 7     |
      | MANA    | 0     |

  @status @happy-path
  Scenario: Student with all MA grades should be APPROVED
    Given a student has the following grades:
      | goal         | grade |
      | Requirements | MA    |
      | Design       | MA    |
      | Tests        | MA    |
    When I evaluate the student's final status
    Then the status should be "APPROVED"

  @status @edge-case
  Scenario: Student with all MANA grades should be FAILED
    Given a student has the following grades:
      | goal         | grade |
      | Requirements | MANA  |
      | Design       | MANA  |
      | Tests        | MANA  |
    When I evaluate the student's final status
    Then the status should be "FAILED"