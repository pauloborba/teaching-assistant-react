@server
Feature: Server Script Answers Management
  As a system
  I want to manage script answers through the API
  So that student submissions are properly retrieved and updated

  Background:
    Given the server API is available

  # ============================================================
  # Retrieval of all script answers
  # ============================================================

  Scenario: Retrieve all registered script answers
    Given there are script answers with IDs "123", "321", "890"
    When I send a GET request to "/api/scriptanswers"
    Then the server should return 200 "OK"
    And the server should return a list containing answers "123", "321", "890"

  Scenario: Retrieve script answers when none exist
    Given there are no script answers registered
    When I send a GET request to "/api/scriptanswers"
    Then the server should return 200 "OK"
    And the server should return an empty list
    

  # ============================================================
  # Retrieval by ID
  # ============================================================

  Scenario: Retrieve a script answer by ID
    Given there is a script answer registered with ID "123"
    When I send a GET request to "/api/scriptanswers/123"
    Then the server should return 200 "OK"
    And the server should return the script answer with ID "123"

  Scenario: Attempt to retrieve a non-existent script answer
    Given there is no script answer registered with ID "777"
    When I send a GET request to "/api/scriptanswers/777"
    Then the server should return 404 "script not found"

  # ============================================================
  # Retrieval by student (CPF-based)
  # ============================================================

  Scenario: Retrieve answers of a registered student
    Given there is a student with CPF "12345678901"
    And this student has script answers with IDs "40", "41", "43"
    When I send a GET request to "/api/scriptanswers/student/12345678901"
    Then the server should return 200 "OK"
    And the server should return a list containing answers "40", "41", "43"

  Scenario: Attempt to retrieve answers of a non-existent student
    Given there is no student with CPF "99999999999" in the server
    When I send a GET request to "/api/scriptanswers/student/99999999999"
    Then the server should return 404 "student not found"


  # ============================================================
  # Retrieval of grade for specific task
  # ============================================================

  Scenario: Retrieve grade of an existing task in an answer
    Given there is a script answer with ID "50"
    And this answer contains a task with ID "2" and grade "MA"
    When I send a GET request to "/api/scriptanswers/50/tasks/2"
    Then the server should return 200 "OK"
    And the server should return grade "MA"

  Scenario: Attempt to retrieve grade for a missing task
    Given there is a script answer with ID "50"
    And this answer does not contain a task with ID "9"
    When I send a GET request to "/api/scriptanswers/50/tasks/9"
    Then the server should return 404 "task not found"

# ============================================================
  # Updating grades
  # ============================================================

  Scenario: Update grade of an existing task with a valid value
    Given there is a script answer with ID "50"
    And this answer contains a task with ID "3" and grade "MANA"
    When I send a PUT request to "/api/scriptanswers/50/tasks/3" with:
      | field | value |
      | grade | MPA   |
    Then the server should return 200 "OK"
    And the server should update the task grade to "MPA"

  Scenario: Attempt to update grade with an invalid value
    Given there is a script answer with ID "50"
    And this answer contains a task with ID "3"
    When I send a PUT request to "/api/scriptanswers/50/tasks/3" with:
      | field | value |
      | grade | AAA   |
    Then the server should return 400 "invalid grade"

    
  # ============================================================
  # Updating task-level comments
  # ============================================================

  Scenario: Successfully add a comment to a task inside a script answer
    Given there is a script answer with ID "50"
    And this answer contains a task with ID "3"
    When I send a PUT request to "/api/scriptanswers/50/tasks/3/comments" with:
      | field   | value                                   |
      | comment | Correto, mas poderia detalhar melhor    |
    Then the server should return 200 "OK"
    And the server should store the comment "Correto, mas poderia detalhar melhor" in task "3"

  Scenario: Attempt to add a comment to a non-existent task inside a script answer
    Given there is a script answer with ID "50"
    And this answer does not contain a task with ID "999"
    When I send a PUT request to "/api/scriptanswers/50/tasks/999/comments" with:
      | field   | value     |
      | comment | Verifique |
    Then the server should return 404 "task not found"

  Scenario: Attempt to add a comment to a task inside a non-existent script answer
    Given there is no script answer with ID "888"
    When I send a PUT request to "/api/scriptanswers/888/tasks/3/comments" with:
      | field   | value                    |
      | comment | Precisa revisar este ponto |
    Then the server should return 404 "answer not found"

