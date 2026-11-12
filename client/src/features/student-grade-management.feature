Feature: Student self-assessment grades

  As a student enrolled in a class
  I want to register, update and remove the grade I assign to myself for each learning goal
  So that my self-assessment is up to date before the deadline set by the professor

  The self-assessment grades are kept apart from the grades the professor assigns
  in the "Evaluations" page. A student can change them only while the class has a
  self-assessment request whose deadline has not passed.

  Background:
    Given the class "ESS (2026/2)" has only the following students:
      | student       |
      | Bruno Tavares |
    And the class "ESS (2026/2)" has a self-assessment request with deadline "20/10/2026"
    And today is before the deadline "20/10/2026"

  # GUI scenarios

  @gui
  Scenario: register a grade for a goal that has no grade yet
    Given the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I assign the self-assessment grade "MPA" to the goal "Requirements"
    And I save the self-assessment
    Then I see the confirmation message "Self-assessment saved"
    And I see the self-assessment grades:
      | goal                     | grade |
      | Requirements             | MPA   |
      | Configuration Management |       |
      | Project Management       |       |
      | Design                   |       |
      | Tests                    |       |
      | Refactoring              |       |

  @gui
  Scenario: update a grade that was already registered
    Given the student "Bruno Tavares" has the self-assessment grade "MANA" for the goal "Tests" in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I assign the self-assessment grade "MA" to the goal "Tests"
    And I save the self-assessment
    Then I see the confirmation message "Self-assessment saved"
    And I see the self-assessment grade "MA" for the goal "Tests"

  @gui
  Scenario: remove a grade that was already registered
    Given the student "Bruno Tavares" has the self-assessment grade "MPA" for the goal "Requirements" in the class "ESS (2026/2)"
    And the student "Bruno Tavares" has the self-assessment grade "MA" for the goal "Tests" in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I remove the self-assessment grade of the goal "Requirements"
    And I save the self-assessment
    Then I see the confirmation message "Self-assessment saved"
    And I see no self-assessment grade for the goal "Requirements"
    And I see the self-assessment grade "MA" for the goal "Tests"

  @gui
  Scenario: fail to change the self-assessment after the deadline
    Given the student "Bruno Tavares" has the self-assessment grade "MPA" for the goal "Requirements" in the class "ESS (2026/2)"
    And today is after the deadline "20/10/2026"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I assign the self-assessment grade "MA" to the goal "Requirements"
    And I save the self-assessment
    Then I see the error message "The self-assessment deadline 20/10/2026 has passed"
    And I see the self-assessment grade "MPA" for the goal "Requirements"

  # Service scenarios
  # The page only offers the grades MANA, MPA and MA and the goals of the class,
  # so the rules below are not observable through the interface.

  @server
  Scenario: store a self-assessment grade without changing the professor grade
    Given the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    And the student "Bruno Tavares" has the professor grade "MA" for the goal "Requirements" in the class "ESS (2026/2)"
    When I request to store the self-assessment grade "MPA" of the student "Bruno Tavares" for the goal "Requirements" in the class "ESS (2026/2)"
    Then the request is accepted
    And the system stores the self-assessment grade "MPA" of the student "Bruno Tavares" for the goal "Requirements" in the class "ESS (2026/2)"
    And the system stores the professor grade "MA" of the student "Bruno Tavares" for the goal "Requirements" in the class "ESS (2026/2)"

  @server
  Scenario: reject a grade that is not accepted by the system
    Given the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    When I request to store the self-assessment grade "XYZ" of the student "Bruno Tavares" for the goal "Tests" in the class "ESS (2026/2)"
    Then the system returns the error "Invalid grade. Must be MANA, MPA, or MA"
    And the system stores no self-assessment grade of the student "Bruno Tavares" in the class "ESS (2026/2)"

  @server
  Scenario: reject a goal that is not evaluated in the class
    Given the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    When I request to store the self-assessment grade "MA" of the student "Bruno Tavares" for the goal "Databases" in the class "ESS (2026/2)"
    Then the system returns the error "Databases is not a goal of the class"
    And the system stores no self-assessment grade of the student "Bruno Tavares" in the class "ESS (2026/2)"

  @server
  Scenario: reject the self-assessment of a student not enrolled in the class
    Given the student "Paulo Souza" is not enrolled in the class "ESS (2026/2)"
    When I request to store the self-assessment grade "MA" of the student "Paulo Souza" for the goal "Tests" in the class "ESS (2026/2)"
    Then the system returns the error "Student not enrolled in this class"
    And the system stores no self-assessment grade of the student "Paulo Souza" in the class "ESS (2026/2)"

  @server
  Scenario: reject the self-assessment when the class has no request
    Given the class "ESS (2026/2)" has no self-assessment request
    And the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    When I request to store the self-assessment grade "MA" of the student "Bruno Tavares" for the goal "Tests" in the class "ESS (2026/2)"
    Then the system returns the error "The self-assessment of the class was not requested"
    And the system stores no self-assessment grade of the student "Bruno Tavares" in the class "ESS (2026/2)"
