Feature: Exam registration and management via user interface
  As a professor
  I want to register exams with rules
  So that I can generate individual versions for enrolled students

  @gui
  Scenario: Register exam with rules
    Given professor "Paulo" accesses the screen "Exam Registration"
    And there is a question bank with available questions
    When the professor provides the title "Requisitos"
    And defines the rules "3 open questions" and "5 closed questions"
    And confirms the exam registration
    Then the system registers the exam "Requisitos" successfully
    And displays the message "Exam registered successfully"
    And the exam "Requisitos" appears in the list of registered exams

  @gui
  Scenario: Validation of invalid rules
    Given professor "Paulo" is filling in the form to create an exam
    When he defines a number of questions greater than the quantity available in the question bank
    Then the system shows the error message "Not enough questions available to meet the selected rules"
    And the system prevents the exam from being saved

  @gui
  Scenario: Generation of individual exams
    Given professor "Paulo" opens the registered exam "Requisitos"
    And the associated class has the enrolled students "Vinícius" and "Pedro"
    When the professor requests the generation of individual exams
    Then the system displays a progress indicator for the generation
    And lists each generated exam with the student’s name and a unique exam identifier

  @gui
  Scenario: Viewing and downloading individual exams
    Given the system has already generated individual versions of exam "Requisitos"
    When professor "Paulo" accesses the tab "Generated Exams"
    Then the system displays each version with the student name, the exam identifier, and the generation date
    And allows the professor to view or download each version

  @gui
  Scenario: Editing exam rules
    Given professor "Paulo" accesses the previously registered exam "Requisitos"
    When he changes the exam rules
    Then the system warns "Changing the rules will invalidate previously generated versions"
    And the system requests confirmation before applying the changes