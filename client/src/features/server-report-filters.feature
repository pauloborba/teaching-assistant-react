@server
Feature: Report Filters
  As a teacher
  I want to view students based on filtered classifications
  So that I can have a better overview on the class in general 

  Background:
    Given the server API is available
    And a class exists with name "Math 101"

  Scenario: Filter students below a specific threshold (Custom Filter)
    Given the following students have evaluations in this class:
      | name   | cpf         | gradeType |
      | Pedro  | 55557777555 | MANA      |
      | Ana    | 66668888666 | MPA       |
    When I request the class report
    And I apply the "BELOW_THRESHOLD" filter with value 6.0
    Then the filtered list should contain exactly 1 student
    And the student "Pedro" should be present in the filtered list

  Scenario: Filter students below class average
    Given the following students have evaluations in this class:
      | name    | cpf         | gradeType |
      | Marcos  | 11133344455 | MANA      |
      | Maria   | 77788833399 | MANA      |
      | Eduarda | 00033344455 | MA        |
    When I request the class report
    And I apply the "BELOW_AVG" filter on the report data
    Then the filtered list should contain exactly 2 students
    And the student "Marcos" should be present in the filtered list
    And the student "Maria" should be present in the filtered list
    And the student "Eduarda" should NOT be present in the filtered list