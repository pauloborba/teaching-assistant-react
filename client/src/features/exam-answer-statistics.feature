Feature: Exam correction and answer statistics

  As a professor responsible for a class
  I want the exams of my class to be corrected against the answer key, and to see how the students answered each question and each alternative
  So that I can identify the content the class did not learn and review it

  An answer is correct when it is the alternative of the answer key. A question left
  blank (an empty cell in the answer tables) is neither correct nor wrong, but it counts
  as a miss in the hit rate, which is the number of correct answers divided by the
  number of students who took the exam.

  Background:
    Given the class "ESS (2026/2)" has only the following students:
      | student       |
      | Ana Ribeiro   |
      | Bruno Tavares |
      | Carla Nunes   |
      | Diego Alves   |
    And the class "ESS (2026/2)" has the exam "Exam 1" with the answer key:
      | question | correct alternative |
      | Q1       | A                   |
      | Q2       | B                   |
      | Q3       | C                   |
    And each question of the exam "Exam 1" has the alternatives from "A" to "D"

  # GUI scenarios

  @gui
  Scenario: see the correction of the exam of each student
    Given the exam "Exam 1" of the class "ESS (2026/2)" was taken only by the following students:
      | student       | Q1 | Q2 | Q3 |
      | Ana Ribeiro   | A  | B  | C  |
      | Bruno Tavares | A  | D  | C  |
      | Carla Nunes   | A  | D  | A  |
      | Diego Alves   | B  | D  | D  |
    When I open the "Exam correction" page of the exam "Exam 1" of the class "ESS (2026/2)"
    Then I see the exam correction:
      | student       | correct answers | wrong questions |
      | Ana Ribeiro   | 3 of 3          |                 |
      | Bruno Tavares | 2 of 3          | Q2              |
      | Carla Nunes   | 1 of 3          | Q2, Q3          |
      | Diego Alves   | 0 of 3          | Q1, Q2, Q3      |

  @gui
  Scenario: see the hit rate of each question
    Given the exam "Exam 1" of the class "ESS (2026/2)" was taken only by the following students:
      | student       | Q1 | Q2 | Q3 |
      | Ana Ribeiro   | A  | B  | C  |
      | Bruno Tavares | A  | D  | C  |
      | Carla Nunes   | A  | D  | A  |
      | Diego Alves   | B  | D  | D  |
    When I open the "Answer statistics" page of the exam "Exam 1" of the class "ESS (2026/2)"
    Then I see the question statistics:
      | question | correct | wrong | blank | hit rate |
      | Q1       | 3       | 1     | 0     | 75%      |
      | Q2       | 1       | 3     | 0     | 25%      |
      | Q3       | 2       | 2     | 0     | 50%      |

  @gui
  Scenario: see how the answers of a question are distributed among its alternatives
    Given the exam "Exam 1" of the class "ESS (2026/2)" was taken only by the following students:
      | student       | Q1 | Q2 | Q3 |
      | Ana Ribeiro   | A  | B  | C  |
      | Bruno Tavares | A  | D  | C  |
      | Carla Nunes   | A  | D  | A  |
      | Diego Alves   | B  | D  | D  |
    And I am at the "Answer statistics" page of the exam "Exam 1" of the class "ESS (2026/2)"
    When I expand the question "Q2"
    Then I see the alternatives of the question "Q2":
      | alternative | students | correct |
      | A           | 0        | no      |
      | B           | 1        | yes     |
      | C           | 0        | no      |
      | D           | 3        | no      |

  @gui
  Scenario: see the questions and the wrong alternatives chosen most often
    Given the exam "Exam 1" of the class "ESS (2026/2)" was taken only by the following students:
      | student       | Q1 | Q2 | Q3 |
      | Ana Ribeiro   | A  | B  | C  |
      | Bruno Tavares | A  | D  | C  |
      | Carla Nunes   | A  | D  | A  |
      | Diego Alves   | B  | D  | D  |
    When I open the "Most missed" page of the exam "Exam 1" of the class "ESS (2026/2)"
    Then I see the most missed questions, in this order:
      | question | wrong |
      | Q2       | 3     |
      | Q3       | 2     |
      | Q1       | 1     |
    And I see the most chosen wrong alternatives, in this order:
      | question | alternative | students |
      | Q2       | D           | 3        |
      | Q1       | B           | 1        |
      | Q3       | A           | 1        |
      | Q3       | D           | 1        |

  @gui
  Scenario: questions with the same number of wrong answers keep the exam order, and fully correct questions are left out
    Given the exam "Exam 1" of the class "ESS (2026/2)" was taken only by the following students:
      | student       | Q1 | Q2 | Q3 |
      | Ana Ribeiro   | A  | B  | C  |
      | Bruno Tavares | B  | A  | C  |
    When I open the "Most missed" page of the exam "Exam 1" of the class "ESS (2026/2)"
    Then I see the most missed questions, in this order:
      | question | wrong |
      | Q1       | 1     |
      | Q2       | 1     |

  @gui
  Scenario: a blank answer counts as a miss in the hit rate but not as a wrong answer
    Given the exam "Exam 1" of the class "ESS (2026/2)" was taken only by the following students:
      | student       | Q1 | Q2 | Q3 |
      | Ana Ribeiro   | A  | B  | C  |
      | Bruno Tavares | A  | B  | C  |
      | Carla Nunes   | A  | B  |    |
    When I open the "Answer statistics" page of the exam "Exam 1" of the class "ESS (2026/2)"
    Then I see the question statistics:
      | question | correct | wrong | blank | hit rate |
      | Q1       | 3       | 0     | 0     | 100%     |
      | Q2       | 3       | 0     | 0     | 100%     |
      | Q3       | 2       | 0     | 1     | 67%      |

  @gui
  Scenario: a blank answer is not a correct answer in the correction of the student
    Given the exam "Exam 1" of the class "ESS (2026/2)" was taken only by the following students:
      | student     | Q1 | Q2 | Q3 |
      | Carla Nunes | A  | B  |    |
    When I open the "Exam correction" page of the exam "Exam 1" of the class "ESS (2026/2)"
    Then I see the exam correction:
      | student     | correct answers | wrong questions |
      | Carla Nunes | 2 of 3          |                 |

  @gui
  Scenario: no statistics for an exam that nobody took
    Given the exam "Exam 1" of the class "ESS (2026/2)" was not taken by any student
    When I open the "Answer statistics" page of the exam "Exam 1" of the class "ESS (2026/2)"
    Then I see the message "Exam 1 has no answers to analyse"
    And I see no question statistics

  # Service scenarios

  @server
  Scenario: store and correct the answers of a student
    Given the exam "Exam 1" of the class "ESS (2026/2)" was not taken by any student
    When I request to store the answers of the exam "Exam 1" of the class "ESS (2026/2)":
      | student       | Q1 | Q2 | Q3 |
      | Bruno Tavares | A  | D  | C  |
    Then the request is accepted
    And the system returns the exam correction:
      | student       | correct answers | wrong questions |
      | Bruno Tavares | 2 of 3          | Q2              |
    And the system stores the answers of the exam "Exam 1" of the class "ESS (2026/2)":
      | student       | Q1 | Q2 | Q3 |
      | Bruno Tavares | A  | D  | C  |

  @server
  Scenario: reject an answer that is not an alternative of the question
    Given the exam "Exam 1" of the class "ESS (2026/2)" was not taken by any student
    When I request to store the answers of the exam "Exam 1" of the class "ESS (2026/2)":
      | student       | Q1 | Q2 | Q3 |
      | Bruno Tavares | A  | E  | C  |
    Then the system returns the error "E is not an alternative of Q2"
    And the system stores no answers of the exam "Exam 1" of the class "ESS (2026/2)"

  @server
  Scenario: reject the answers of a student not enrolled in the class
    Given the student "Paulo Souza" is not enrolled in the class "ESS (2026/2)"
    And the exam "Exam 1" of the class "ESS (2026/2)" was not taken by any student
    When I request to store the answers of the exam "Exam 1" of the class "ESS (2026/2)":
      | student     | Q1 | Q2 | Q3 |
      | Paulo Souza | A  | B  | C  |
    Then the system returns the error "Student not enrolled in this class"
    And the system stores no answers of the exam "Exam 1" of the class "ESS (2026/2)"

  @server
  Scenario: fail to get the statistics of an exam that does not belong to the class
    Given the class "ESS (2026/2)" has no exam "Exam 9"
    When I request the answer statistics of the exam "Exam 9" of the class "ESS (2026/2)"
    Then the system returns the error "Exam not found"
