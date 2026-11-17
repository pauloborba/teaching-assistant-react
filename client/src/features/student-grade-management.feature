Feature: Student self-assessment grades

  As a student enrolled in a class
  I want to register, update and remove the grade I assign to myself for each learning goal
  So that the professor can compare my self-assessment with the grades I received

  The self-assessment grades are kept apart from the grades the professor assigns
  in the "Evaluations" page, where they are shown, read only, in a "Self-assessment"
  row below each student. A student can submit the self-assessment at any time,
  whether or not the professor has requested it and whether or not the deadline of
  the request has passed: the request only notifies the students.

  A submission replaces the previous one: a goal left without grade has no grade
  after it. A submission must give a grade to at least one goal.

  Background:
    Given the class "ESS (2026/2)" has only the following students:
      | student       |
      | Bruno Tavares |

  # GUI scenarios

  @gui
  Scenario: register a grade for a goal that has no grade yet
    Given the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I assign the self-assessment grade "MPA" to the goal "Requirements"
    And I submit the self-assessment
    Then I see the confirmation message "Self-assessment submitted"
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
    And I submit the self-assessment
    Then I see the confirmation message "Self-assessment submitted"
    And I see the self-assessment grade "MA" for the goal "Tests"

  @gui
  Scenario: remove a grade that was already registered
    Given the student "Bruno Tavares" has the self-assessment grade "MPA" for the goal "Requirements" in the class "ESS (2026/2)"
    And the student "Bruno Tavares" has the self-assessment grade "MA" for the goal "Tests" in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I remove the self-assessment grade of the goal "Requirements"
    And I submit the self-assessment
    Then I see the confirmation message "Self-assessment submitted"
    And I see no self-assessment grade for the goal "Requirements"
    And I see the self-assessment grade "MA" for the goal "Tests"

  @gui
  Scenario: submit a grade for every goal
    Given the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I assign the self-assessment grades:
      | goal                     | grade |
      | Requirements             | MA    |
      | Configuration Management | MPA   |
      | Project Management       | MANA  |
      | Design                   | MA    |
      | Tests                    | MPA   |
      | Refactoring              | MANA  |
    And I submit the self-assessment
    Then I see the confirmation message "Self-assessment submitted"
    And I see the self-assessment grades:
      | goal                     | grade |
      | Requirements             | MA    |
      | Configuration Management | MPA   |
      | Project Management       | MANA  |
      | Design                   | MA    |
      | Tests                    | MPA   |
      | Refactoring              | MANA  |

  @gui
  Scenario: submit the self-assessment although the professor did not request it
    Given the class "ESS (2026/2)" has no self-assessment request
    And the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I assign the self-assessment grade "MPA" to the goal "Design"
    And I submit the self-assessment
    Then I see the confirmation message "Self-assessment submitted"
    And I see the self-assessment grade "MPA" for the goal "Design"

  @gui
  Scenario: submit the self-assessment after the deadline of the request
    Given the class "ESS (2026/2)" has a self-assessment request with deadline "20/10/2026"
    And the student "Bruno Tavares" has the self-assessment grade "MPA" for the goal "Requirements" in the class "ESS (2026/2)"
    And today is after the deadline "20/10/2026"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I assign the self-assessment grade "MA" to the goal "Requirements"
    And I submit the self-assessment
    Then I see the confirmation message "Self-assessment submitted"
    And I see the self-assessment grade "MA" for the goal "Requirements"

  @gui
  Scenario: fail to submit an empty self-assessment
    Given the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I submit the self-assessment
    Then I see the error message "Assign a grade to at least one goal"
    And I see no self-assessment grade for the goal "Requirements"

  @gui
  Scenario: fail to remove every grade of the self-assessment
    Given the student "Bruno Tavares" has the self-assessment grade "MPA" for the goal "Requirements" in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I remove the self-assessment grade of the goal "Requirements"
    And I submit the self-assessment
    Then I see the error message "Assign a grade to at least one goal"
    And I see the self-assessment grade "MPA" for the goal "Requirements"

  @gui
  Scenario: the submitted self-assessment appears below the student in the evaluations
    Given the student "Bruno Tavares" has the professor grade "MA" for the goal "Requirements" in the class "ESS (2026/2)"
    And the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    And I am at the "My self-assessment" page of the class "ESS (2026/2)" as the student "Bruno Tavares"
    When I assign the self-assessment grade "MPA" to the goal "Requirements"
    And I assign the self-assessment grade "MA" to the goal "Tests"
    And I submit the self-assessment
    And I open the "Evaluations" page of the class "ESS (2026/2)"
    Then I see the professor grade "MA" of the student "Bruno Tavares" for the goal "Requirements"
    And I see the self-assessment row of the student "Bruno Tavares":
      | goal                     | grade |
      | Requirements             | MPA   |
      | Configuration Management |       |
      | Project Management       |       |
      | Design                   |       |
      | Tests                    | MA    |
      | Refactoring              |       |

  # Service scenarios
  # The page only offers the grades MANA, MPA and MA and the goals of the class,
  # so the rules below are not observable through the interface.

  @server
  Scenario: a submission replaces the self-assessment, without changing the professor grades
    Given the student "Bruno Tavares" has the self-assessment grade "MANA" for the goal "Design" in the class "ESS (2026/2)"
    And the student "Bruno Tavares" has the professor grade "MA" for the goal "Requirements" in the class "ESS (2026/2)"
    When I submit the self-assessment of the student "Bruno Tavares" in the class "ESS (2026/2)":
      | goal         | grade |
      | Requirements | MPA   |
      | Tests        | MA    |
    Then the request is accepted
    And the system stores the self-assessment of the student "Bruno Tavares" in the class "ESS (2026/2)":
      | goal         | grade |
      | Requirements | MPA   |
      | Tests        | MA    |
    And the system stores the professor grade "MA" of the student "Bruno Tavares" for the goal "Requirements" in the class "ESS (2026/2)"

  @server
  Scenario: reject an empty submission, keeping the stored self-assessment
    Given the student "Bruno Tavares" has the self-assessment grade "MPA" for the goal "Requirements" in the class "ESS (2026/2)"
    When I submit the self-assessment of the student "Bruno Tavares" in the class "ESS (2026/2)":
      | goal | grade |
    Then the system returns the error "Assign a grade to at least one goal"
    And the system stores the self-assessment of the student "Bruno Tavares" in the class "ESS (2026/2)":
      | goal         | grade |
      | Requirements | MPA   |

  @server
  Scenario: reject a grade that is not accepted by the system, storing nothing of the submission
    Given the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    When I submit the self-assessment of the student "Bruno Tavares" in the class "ESS (2026/2)":
      | goal   | grade |
      | Tests  | MA    |
      | Design | XYZ   |
    Then the system returns the error "Invalid grade. Must be MANA, MPA, or MA"
    And the system stores no self-assessment grade of the student "Bruno Tavares" in the class "ESS (2026/2)"

  @server
  Scenario: reject a goal that is not evaluated in the class
    Given the student "Bruno Tavares" has no self-assessment grade in the class "ESS (2026/2)"
    When I submit the self-assessment of the student "Bruno Tavares" in the class "ESS (2026/2)":
      | goal      | grade |
      | Databases | MA    |
    Then the system returns the error "Databases is not a goal of the class"
    And the system stores no self-assessment grade of the student "Bruno Tavares" in the class "ESS (2026/2)"

  @server
  Scenario: reject the self-assessment of a student not enrolled in the class
    Given the student "Paulo Souza" is not enrolled in the class "ESS (2026/2)"
    When I submit the self-assessment of the student "Paulo Souza" in the class "ESS (2026/2)":
      | goal  | grade |
      | Tests | MA    |
    Then the system returns the error "Student not enrolled in this class"
    And the system stores no self-assessment grade of the student "Paulo Souza" in the class "ESS (2026/2)"
