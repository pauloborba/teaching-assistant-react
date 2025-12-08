@server
Feature: Exams autocorrection
  As a teacher
  I want to automatically correct all exams from a test
  So that all students can receive their grades

  Scenario: Update grades
    Given student "Vinícius" answered "a" and "b" for questions "1" and "2" respectively in exam "Requisitos" of class "ESS"
    And the correct answers for those questions are "a" and "b"
    And the teacher is in the exam "Requisitos"
    When the teacher asks the system to correct the exam "Requisitos"
    Then student "Vinícius" is registered with grade "100" for exam "Requisitos" of class "ESS"
    And "Vinícius" appears on the screen with grade "100"

  Scenario: Update all students grades in an exam
    Given class "ESS" has students "Vinícius" and "Pedro"
    And "Vinícius" answered "1" and "Pedro" answered "2" for question "1" in exam "Gerência"
    And the correct answer for question "1" is "2"
    When the teacher asks the system to correct all tests in exam "Gerência"
    Then "Vinícius" is registered with grade "0" for exam "Ger" of class "ESS"
    And "Pedro" is registered with grade "100" for exam "Gerência" of class "ESS"

  Scenario: Student did not answer all questions
    Given exam "Requisitos" of class "ESS" has questions "1", "2" and "3"
    And correct answers are "a", "b" and "c"
    And student "Vinícius" answered only "a" and "b"
    When the teacher asks the system to correct the exam
    Then "Vinícius" is registered with grade "66.7" for exam "Requisitos" of class "ESS"
    
  Scenario: Student did not answer the exam
    Given the student "Vinicius" did not answered the exam "Requisitos" in class "ESS"
    When the teacher loads the class "ESS" dashboard
    Then "Vinicius" appears with grade "Não respondido"

  Scenario: Teacher can only correct one exam
    Given the teacher in the class "ESS" page
    And the teacher did not select any exam
    When the teacher asks the system to correct the grades
    Then the system does nothing, and do not allow to correct grades
