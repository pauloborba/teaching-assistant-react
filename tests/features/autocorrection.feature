Feature: Exams autocorrection
  As a teacher
  I want to automatically correct all exams from a test
  So that all students can receive their grades

  Scenario: Update grades with equal weights
    Given student "Vinícius" answered "a" and "b" for questions "1" and "2" respectively in exam "Requisitos" of class "ESS"
    And the correct answers for those questions are "a" and "b"
    And teacher "Paulo" with CPF "123" is assigned to class "ESS"
    And teacher "Paulo" is viewing the exam "Requisitos"
    When the teacher asks the system to correct the exam "Requisitos"
    Then student "Vinícius" is registered with grade "10" for exam "Requisitos" of class "ESS"
    And "Vinícius" appears on the screen with grade "10"

  Scenario: Only teachers can update grades
    Given student "Vinícius" is a monitor in class "ESS"
    And "Vinícius" is not a teacher
    When "Vinícius" tries to access the exam "Requisitos"
    Then the system shows the error "Students and monitors are not allowed to correct exams"

  Scenario: Only the assigned teacher can correct the exam
    Given teacher "Carlos" with CPF "321" exists
    And teacher "Paulo" with CPF "123" is the only teacher assigned to class "ESS"
    When "Carlos" tries to access the exam "Requisitos" of class "ESS"
    Then the system shows the error "You are not responsible for this class"

  Scenario: Update grades with different question weights
    Given exam "Requisitos" of class "ESS" has questions "1", "2", and "3" with weights "2", "3", and "4" respectively
    And the correct answers are "5", "6", and "7"
    And student "Vinícius" answered "5", "6", and "10"
    And teacher "Paulo" with CPF "123" is viewing the exam "Requisitos"
    When the teacher asks the system to correct the exam
    Then "Vinícius" is registered with grade "5.56" for exam "Requisitos" of class "ESS"
    And "Vinícius" appears on the screen with grade "5.56"

  Scenario: Update all students’ grades in an exam
    Given class "ESS" has students "Vinícius" and "Pedro"
    And "Vinícius" answered "1" and "Pedro" answered "2" for question "1" in exam "Gerência"
    And the correct answer for question "1" is "2"
    And teacher "Paulo" is assigned to class "ESS"
    When teacher "Paulo" asks the system to correct all tests in exam "Gerência"
    Then "Vinícius" is registered with grade "0" for exam "Ger" of class "ESS"
    And "Pedro" is registered with grade "10" for exam "Gerência" of class "ESS"

  Scenario: Correct exams with open-ended questions
    Given class "ESS" has student "Vinícius"
    And "Vinícius" answered "1" and "Ótima visão" for questions "1" and "2" respectively in exam "Requisitos"
    And the correct answers are "1" and "Boa visão"
    And teacher "Paulo" is assigned to class "ESS"
    When teacher "Paulo" asks the system to correct the exam "Requisitos"
    Then the system requests evaluation from LLM "Gemini"
    And "Vinícius" is registered with grade "8" for exam "Requisitos" of class "ESS"

  Scenario: Student did not answer all questions
    Given exam "Requisitos" of class "ESS" has questions "1", "2" and "3"
    And correct answers are "a", "b" and "c"
    And student "Vinícius" answered only "a" and "b"
    When teacher "Paulo" asks the system to correct the exam
    Then "Vinícius" is registered with grade "6.67" for exam "Requisitos" of class "ESS"
    
  Scenario: Show progress bar during correction
    Given teacher "Paulo" is viewing exam "Requisitos"
    When the teachers asks the system to correct the exam
    Then a progress bar appears with status updates until completion
