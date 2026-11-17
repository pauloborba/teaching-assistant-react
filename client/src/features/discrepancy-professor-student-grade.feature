Feature: Discrepancy between self-assessment and professor grades

  As a professor responsible for a class
  I want to see the students whose self-assessment grades differ too much from the grades I assigned
  So that I can quickly identify the students who assessed themselves very differently from my assessment

  Rules:
  - the grades, in increasing order, are "MANA", "MPA" and "MA"
  - the divergence of a goal is the number of levels between the self-assessment grade and the professor grade
  - only the goals that have both grades are considered
  - the discrepancy of a student is the sum of the divergences of the considered goals
  - a student is discrepant when the discrepancy is greater than the discrepancy threshold of the class
  - the percentage of discrepant students is computed over the students whose discrepancy could be computed
  - the discrepancy threshold of a class is an integer from 0 to 2

  In the grade tables, a goal that does not appear has no grade, and "-" means no grade.

  The discrepancies are shown in the "Evaluations" page of the class, above the table of grades.

  # GUI scenarios

  @gui
  Scenario: list the discrepant students by decreasing discrepancy
    Given the discrepancy threshold of the class "ESS (2026/2)" is "1"
    And the class "ESS (2026/2)" has only the following students:
      | student       |
      | Carlos Lima   |
      | Beatriz Souza |
      | Rafael Costa  |
    And the class "ESS (2026/2)" has the following grades:
      | student       | professor Requirements | professor Tests | self-assessment Requirements | self-assessment Tests |
      | Carlos Lima   | MANA                   | MANA            | MA                           | MA                    |
      | Beatriz Souza | MA                     | MPA             | MA                           | MPA                   |
      | Rafael Costa  | MPA                    | MANA            | MA                           | MPA                   |
    When I open the "Evaluations" page of the class "ESS (2026/2)"
    Then I see the discrepant students, in this order:
      | student      | discrepancy |
      | Carlos Lima  | 4           |
      | Rafael Costa | 2           |
    And I see "2" of "3" students as discrepant, which is "67%"

  @gui
  Scenario: a discrepancy equal to the threshold is not a discrepancy
    Given the discrepancy threshold of the class "ESS (2026/2)" is "2"
    And the class "ESS (2026/2)" has only the following students:
      | student      |
      | João Pereira |
      | Maria Alves  |
    And the class "ESS (2026/2)" has the following grades:
      | student      | professor Requirements | professor Tests | self-assessment Requirements | self-assessment Tests |
      | João Pereira | MPA                    | MANA            | MA                           | MPA                   |
      | Maria Alves  | MANA                   | MPA             | MA                           | MA                    |
    When I open the "Evaluations" page of the class "ESS (2026/2)"
    Then I see the discrepant students, in this order:
      | student     | discrepancy |
      | Maria Alves | 3           |
    And I see "1" of "2" students as discrepant, which is "50%"

  @gui
  Scenario: no discrepant student in the class
    Given the discrepancy threshold of the class "ESS (2026/2)" is "2"
    And the class "ESS (2026/2)" has only the following students:
      | student       |
      | Ana Ribeiro   |
      | Bruno Tavares |
    And the class "ESS (2026/2)" has the following grades:
      | student       | professor Requirements | professor Tests | self-assessment Requirements | self-assessment Tests |
      | Ana Ribeiro   | MA                     | MPA             | MA                           | MA                    |
      | Bruno Tavares | MPA                    | MPA             | MPA                          | MPA                   |
    When I open the "Evaluations" page of the class "ESS (2026/2)"
    Then I see the message "The class has no discrepant students"
    And I see "0" of "2" students as discrepant, which is "0%"

  @gui
  Scenario: students whose discrepancy cannot be computed
    Given the discrepancy threshold of the class "ESS (2026/2)" is "1"
    And the class "ESS (2026/2)" has only the following students:
      | student     |
      | Carlos Lima |
      | Maria Alves |
      | Lucas Rocha |
    And the class "ESS (2026/2)" has the following grades:
      | student     | professor Requirements | professor Tests | self-assessment Requirements | self-assessment Tests |
      | Carlos Lima | MANA                   | MANA            | MA                           | MA                    |
      | Maria Alves | -                      | -               | MA                           | MA                    |
      | Lucas Rocha | MPA                    | MPA             | -                            | -                     |
    When I open the "Evaluations" page of the class "ESS (2026/2)"
    Then I see the discrepant students, in this order:
      | student     | discrepancy |
      | Carlos Lima | 4           |
    And I see the students whose discrepancy could not be computed:
      | student     | missing                |
      | Maria Alves | professor grades       |
      | Lucas Rocha | self-assessment grades |
    And I see "1" of "1" students as discrepant, which is "100%"

  @gui
  Scenario: change the discrepancy threshold of the class
    Given the discrepancy threshold of the class "ESS (2026/2)" is "2"
    And the class "ESS (2026/2)" has only the following students:
      | student     |
      | Pedro Melo  |
      | Ana Ribeiro |
    And the class "ESS (2026/2)" has the following grades:
      | student     | professor Requirements | professor Tests | self-assessment Requirements | self-assessment Tests |
      | Pedro Melo  | MPA                    | MPA             | MA                           | MA                    |
      | Ana Ribeiro | MA                     | MA              | MA                           | MA                    |
    And I am at the "Evaluations" page of the class "ESS (2026/2)"
    When I change the discrepancy threshold to "1"
    Then I see the discrepancy threshold "1"
    And I see the discrepant students, in this order:
      | student    | discrepancy |
      | Pedro Melo | 2           |

  @gui
  Scenario: changing a professor grade updates the discrepancies
    Given the discrepancy threshold of the class "ESS (2026/2)" is "1"
    And the class "ESS (2026/2)" has only the following students:
      | student    |
      | Pedro Melo |
    And the class "ESS (2026/2)" has the following grades:
      | student    | professor Requirements | professor Tests | self-assessment Requirements | self-assessment Tests |
      | Pedro Melo | MPA                    | MPA             | MA                           | MA                    |
    And I am at the "Evaluations" page of the class "ESS (2026/2)"
    And I see the discrepant students, in this order:
      | student    | discrepancy |
      | Pedro Melo | 2           |
    When I assign the professor grade "MA" to the goal "Requirements" of the student "Pedro Melo"
    Then I see the message "The class has no discrepant students"
    And I see "0" of "1" students as discrepant, which is "0%"

  # Service scenarios

  @server
  Scenario: get the discrepancies of a class without changing the grades
    Given the discrepancy threshold of the class "ESS (2026/2)" is "1"
    And the class "ESS (2026/2)" has only the following students:
      | student       |
      | Carlos Lima   |
      | Beatriz Souza |
    And the class "ESS (2026/2)" has the following grades:
      | student       | professor Requirements | professor Tests | self-assessment Requirements | self-assessment Tests |
      | Carlos Lima   | MANA                   | MANA            | MA                           | MA                    |
      | Beatriz Souza | MA                     | MPA             | MA                           | MPA                   |
    When I request the discrepancies of the class "ESS (2026/2)"
    Then the system returns the discrepancies:
      | student       | discrepancy | discrepant |
      | Carlos Lima   | 4           | yes        |
      | Beatriz Souza | 0           | no         |
    And the system stores the grades of the class "ESS (2026/2)":
      | student       | professor Requirements | professor Tests | self-assessment Requirements | self-assessment Tests |
      | Carlos Lima   | MANA                   | MANA            | MA                           | MA                    |
      | Beatriz Souza | MA                     | MPA             | MA                           | MPA                   |

  @server
  Scenario: reject a negative discrepancy threshold
    Given the discrepancy threshold of the class "ESS (2026/2)" is "2"
    When I request to change the discrepancy threshold of the class "ESS (2026/2)" to "-1"
    Then the system returns the error "The threshold must be a non-negative integer"
    And the system stores the discrepancy threshold "2" for the class "ESS (2026/2)"

  @server
  Scenario: reject a discrepancy threshold above the maximum
    Given the discrepancy threshold of the class "ESS (2026/2)" is "2"
    When I request to change the discrepancy threshold of the class "ESS (2026/2)" to "3"
    Then the system returns the error "The threshold must be at most 2"
    And the system stores the discrepancy threshold "2" for the class "ESS (2026/2)"

  @server
  Scenario: fail to get the discrepancies of a class that does not exist
    Given the system has no class "ESS (2030/1)"
    When I request the discrepancies of the class "ESS (2030/1)"
    Then the system returns the error "Class not found"
