Feature: Self-assessment status

  As a professor responsible for a class
  I want to see which students have already completed their self-assessment and which have not
  So that I can follow the self-assessment of the class and remind the students who are late

  A student has the status "Completed" when it has a self-assessment grade for each
  of the six goals of the class: "Requirements", "Configuration Management",
  "Project Management", "Design", "Tests" and "Refactoring". Otherwise the status is
  "Pending", and the page shows how many of the six goals already have a grade.
  The status does not depend on the request: a student can complete the
  self-assessment before the professor requests it.

  Background:
    Given the class "ESS (2026/2)" has only the following students:
      | student         |
      | Ian Monteiro    |
      | Henrique Xavier |
      | Matheus Menezes |
    And the class "ESS (2026/2)" has a self-assessment request with deadline "20/10/2026"
    And today is before the deadline "20/10/2026"

  # GUI scenarios

  @gui
  Scenario: see who has completed the self-assessment and who has not
    Given the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has the self-assessment grade "MA" for the goal "Requirements" in the class "ESS (2026/2)"
    And the student "Henrique Xavier" has the self-assessment grade "MPA" for the goal "Tests" in the class "ESS (2026/2)"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    When I open the "Self-assessment requests" page of the class "ESS (2026/2)"
    Then I see the self-assessment status:
      | student         | status    | goals graded |
      | Ian Monteiro    | Completed | 6 of 6       |
      | Henrique Xavier | Pending   | 2 of 6       |
      | Matheus Menezes | Pending   | 0 of 6       |
    And I see "1" of "3" students with the self-assessment completed

  @gui
  Scenario: see only the students with pending self-assessment
    Given the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has the self-assessment grade "MA" for the goal "Requirements" in the class "ESS (2026/2)"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    And I am at the "Self-assessment requests" page of the class "ESS (2026/2)"
    When I filter the students by the status "Pending"
    Then I see the self-assessment status:
      | student         | status  | goals graded |
      | Henrique Xavier | Pending | 1 of 6       |
      | Matheus Menezes | Pending | 0 of 6       |

  @gui
  Scenario: a student with one goal without grade is still pending
    Given the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)" except "Design"
    And the student "Henrique Xavier" has no self-assessment grade in the class "ESS (2026/2)"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    When I open the "Self-assessment requests" page of the class "ESS (2026/2)"
    Then I see the self-assessment status:
      | student         | status  | goals graded |
      | Ian Monteiro    | Pending | 5 of 6       |
      | Henrique Xavier | Pending | 0 of 6       |
      | Matheus Menezes | Pending | 0 of 6       |
    And I see "0" of "3" students with the self-assessment completed

  @gui
  Scenario: the status of a class without self-assessment request
    Given the class "ESS (2027/1)" has only the following students:
      | student       |
      | Ana Ribeiro   |
      | Bruno Tavares |
    And the class "ESS (2027/1)" has no self-assessment request
    And the student "Ana Ribeiro" has self-assessment grades for all the goals of the class "ESS (2027/1)"
    And the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2027/1)"
    When I open the "Self-assessment requests" page of the class "ESS (2027/1)"
    Then I see the message "The self-assessment of the class was not requested yet"
    And I see the self-assessment status:
      | student       | status    | goals graded |
      | Ana Ribeiro   | Completed | 6 of 6       |
      | Bruno Tavares | Pending   | 0 of 6       |

  # Service scenarios

  @server
  Scenario: get the self-assessment status of a class
    Given the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has the self-assessment grade "MA" for the goal "Requirements" in the class "ESS (2026/2)"
    And the student "Henrique Xavier" has the self-assessment grade "MPA" for the goal "Tests" in the class "ESS (2026/2)"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    When I request the self-assessment status of the class "ESS (2026/2)"
    Then the system returns the self-assessment status:
      | student         | status    | goals graded |
      | Ian Monteiro    | Completed | 6            |
      | Henrique Xavier | Pending   | 2            |
      | Matheus Menezes | Pending   | 0            |
    And the system stores the self-assessment grade "MA" of the student "Henrique Xavier" for the goal "Requirements" in the class "ESS (2026/2)"
    And the system stores the self-assessment grade "MPA" of the student "Henrique Xavier" for the goal "Tests" in the class "ESS (2026/2)"

  @server
  Scenario: fail to get the self-assessment status of a class that does not exist
    Given the system has no class "ESS (2030/1)"
    When I request the self-assessment status of the class "ESS (2030/1)"
    Then the system returns the error "Class not found"
