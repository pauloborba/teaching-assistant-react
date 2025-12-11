Feature: Exams autocorrection
  As a teacher
  I want to asks the system to correct the closed questions
  So that all students can receive their grades for the closed questions

  @autocorrection-gui
  Scenario: Cannot correct exam without selecting one
    Given no exam is selected for correction
    When the teacher loads the page
    Then no option to correct the exam is shown

  @autocorrection-gui
  Scenario: Cannot view corrections without selecting an exam
    Given no exam is selected for viewing corrections
    When the teacher loads the page
    Then no option to view corrections is shown

  @autocorrection-gui
  Scenario: Viewing corrections after correcting an exam
    Given student "Vinicius" with cpf "123" has grade "100" for "Q1" and grade "0" for "Q2" in exam "2"
    And student "Maria" with cpf "456" has grade "100" for "Q1" and grade "100" for "Q2" in exam "2"
    And exam "2" has been corrected
    When the teacher opens the corrections view modal
    Then the modal shows student "Vinicius" with cpf "123" with grade "0" for "Q1" and grade "100" for "Q2" and media "50"
    And the modal shows student "Maria" with cpf "456" with grade "100" for "Q1" and grade "100" for "Q2" and media "100"
  
  @autocorrection-gui
  Scenario: Viewing corrections when no students answered the exam
    Given exam "3" has no students who answered it
    When the teacher opens the corrections view modal
    Then the modal shows a message indicating that no students answered the exam
  
  @autocorrection-gui
  Scenario: Viewing corrections when exam has not been corrected yet
    Given "Rafael" with cpf "789" has answered "Q1" and "Q2" for exam "4"
    And exam "4" has not been corrected yet
    When the teacher opens the corrections view modal
    Then the modal shows "Rafael" with cpf "789" with Q1 "Não corrigido" e Q2 "Não corrigido" and media empty

  @autocorrection-gui
  Scenario: Attempting to correct an exam that was already corrected
    Given exam "4" was already corrected
    When the teacher tries to correct exam "4" again
    Then the system shows an error message indicating the exam was already corrected

  @autocorrection-gui
  Scenario: Media when one question has no grade
    Given student "Ana" with cpf "321" has grade "100" for "Q1" and no grade for "Q2" in exam "5"
    When the teacher opens the corrections view modal
    Then the modal shows student "Ana" with cpf "321" with grade "100" for "Q1" and "Não corrigido" for "Q2" and media empty

  
