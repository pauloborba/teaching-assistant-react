Feature: Self-assessment request

  As a professor responsible for a class
  I want to request the self-assessment of the students of my class and remind those who have not completed it yet
  So that all students complete their self-assessment before the deadline

  A student has completed the self-assessment when it has a self-assessment grade
  for each of the six goals of the class: "Requirements", "Configuration Management",
  "Project Management", "Design", "Tests" and "Refactoring".

  The request and the reminders only notify the students who have not completed
  the self-assessment. They never restrict it: a student can submit it before the
  request, and after its deadline.

  Background:
    Given the class "ESS (2026/2)" has only the following students:
      | student         | email                |
      | Ian Monteiro    | ian@cin.ufpe.br      |
      | Henrique Xavier | henrique@cin.ufpe.br |
      | Matheus Menezes | matheus@cin.ufpe.br  |

  # GUI scenarios

  @gui
  Scenario: request the self-assessment of a class
    Given the class "ESS (2026/2)" has no self-assessment request
    And the student "Ian Monteiro" has no self-assessment grade in the class "ESS (2026/2)"
    And the student "Henrique Xavier" has no self-assessment grade in the class "ESS (2026/2)"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    And today is before the deadline "20/10/2026"
    And I am at the "Self-assessment requests" page of the class "ESS (2026/2)"
    When I request the self-assessment with deadline "20/10/2026"
    Then I see the confirmation message "Self-assessment requested from 3 students"
    And I see the self-assessment deadline "20/10/2026"
    And I see the self-assessment status:
      | student         | status  | last reminder |
      | Ian Monteiro    | Pending |               |
      | Henrique Xavier | Pending |               |
      | Matheus Menezes | Pending |               |

  @gui
  Scenario: the request is not sent to the students who already completed the self-assessment
    Given the class "ESS (2026/2)" has no self-assessment request
    And the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has self-assessment grades for all the goals of the class "ESS (2026/2)" except "Design"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    And today is before the deadline "20/10/2026"
    And I am at the "Self-assessment requests" page of the class "ESS (2026/2)"
    When I request the self-assessment with deadline "20/10/2026"
    Then I see the confirmation message "Self-assessment requested from 2 students"
    And I see the self-assessment status:
      | student         | status    | last reminder |
      | Ian Monteiro    | Completed |               |
      | Henrique Xavier | Pending   |               |
      | Matheus Menezes | Pending   |               |

  @gui
  Scenario: send a reminder only to the students with pending self-assessment
    Given the class "ESS (2026/2)" has a self-assessment request with deadline "20/10/2026"
    And the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has no self-assessment grade in the class "ESS (2026/2)"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    And today is before the deadline "20/10/2026"
    And I am at the "Self-assessment requests" page of the class "ESS (2026/2)"
    When I send a reminder to the students with pending self-assessment
    Then I see the confirmation message "Reminder sent to 2 students"
    And I see the self-assessment status:
      | student         | status    | last reminder |
      | Ian Monteiro    | Completed |               |
      | Henrique Xavier | Pending   | today         |
      | Matheus Menezes | Pending   | today         |

  @gui
  Scenario: fail to send a reminder after the deadline
    Given the class "ESS (2026/2)" has a self-assessment request with deadline "20/10/2026"
    And the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has no self-assessment grade in the class "ESS (2026/2)"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    And the student "Henrique Xavier" received the last reminder of the class "ESS (2026/2)" on "15/10/2026"
    And today is after the deadline "20/10/2026"
    And I am at the "Self-assessment requests" page of the class "ESS (2026/2)"
    When I send a reminder to the students with pending self-assessment
    Then I see the error message "The self-assessment deadline 20/10/2026 has passed"
    And I see the self-assessment status:
      | student         | status    | last reminder |
      | Ian Monteiro    | Completed |               |
      | Henrique Xavier | Pending   | 15/10/2026    |
      | Matheus Menezes | Pending   |               |

  @gui
  Scenario: no reminder when all the students have completed the self-assessment
    Given the class "ESS (2026/2)" has a self-assessment request with deadline "20/10/2026"
    And the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Matheus Menezes" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And today is before the deadline "20/10/2026"
    And I am at the "Self-assessment requests" page of the class "ESS (2026/2)"
    When I send a reminder to the students with pending self-assessment
    Then I see the message "No student has a pending self-assessment"
    And I see the self-assessment status:
      | student         | status    | last reminder |
      | Ian Monteiro    | Completed |               |
      | Henrique Xavier | Completed |               |
      | Matheus Menezes | Completed |               |

  # Service scenarios

  @server
  Scenario: the request is sent by email only to the students who have not completed the self-assessment
    Given the class "ESS (2026/2)" has no self-assessment request
    And the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has self-assessment grades for all the goals of the class "ESS (2026/2)" except "Design"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    And today is before the deadline "20/10/2026"
    When I request the self-assessment of the class "ESS (2026/2)" with deadline "20/10/2026"
    Then the request is accepted
    And the system stores a self-assessment request of the class "ESS (2026/2)" with deadline "20/10/2026"
    And the system sends the email "Self-assessment request" with deadline "20/10/2026" only to:
      | email                |
      | henrique@cin.ufpe.br |
      | matheus@cin.ufpe.br  |

  @server
  Scenario: the request sends no email when every student has completed the self-assessment
    Given the class "ESS (2026/2)" has no self-assessment request
    And the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Matheus Menezes" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And today is before the deadline "20/10/2026"
    When I request the self-assessment of the class "ESS (2026/2)" with deadline "20/10/2026"
    Then the request is accepted
    And the system stores a self-assessment request of the class "ESS (2026/2)" with deadline "20/10/2026"
    And the system sends no email

  @server
  Scenario: the reminder is sent only to the students with pending self-assessment
    Given the class "ESS (2026/2)" has a self-assessment request with deadline "20/10/2026"
    And the student "Ian Monteiro" has self-assessment grades for all the goals of the class "ESS (2026/2)"
    And the student "Henrique Xavier" has no self-assessment grade in the class "ESS (2026/2)"
    And the student "Matheus Menezes" has no self-assessment grade in the class "ESS (2026/2)"
    And today is before the deadline "20/10/2026"
    When I request a self-assessment reminder for the class "ESS (2026/2)"
    Then the request is accepted
    And the system sends the email "Self-assessment reminder" with deadline "20/10/2026" only to:
      | email                |
      | henrique@cin.ufpe.br |
      | matheus@cin.ufpe.br  |
    And the system stores the last reminders of the class "ESS (2026/2)":
      | student         | last reminder |
      | Ian Monteiro    |               |
      | Henrique Xavier | today         |
      | Matheus Menezes | today         |

  @server
  Scenario: reject a request with a past deadline
    Given the class "ESS (2026/2)" has no self-assessment request
    And today is after the deadline "01/10/2026"
    When I request the self-assessment of the class "ESS (2026/2)" with deadline "01/10/2026"
    Then the system returns the error "The deadline must be after today"
    And the system stores no self-assessment request of the class "ESS (2026/2)"
    And the system sends no email

  @server
  Scenario: reject a request for a class with no enrolled students
    Given the class "ESS (2027/1)" has no enrolled students
    And the class "ESS (2027/1)" has no self-assessment request
    And today is before the deadline "20/10/2026"
    When I request the self-assessment of the class "ESS (2027/1)" with deadline "20/10/2026"
    Then the system returns the error "The class has no enrolled students"
    And the system stores no self-assessment request of the class "ESS (2027/1)"
    And the system sends no email
