Feature: Open Question Grading
  As a teacher
  I want to grade open questions using an AI model
  So that I can save time and improve the accuracy of the grades

  @gui @ai-correction
  Scenario: Successful Initiation with Model Selection
  Given teacher "Paulo" is viewing the exam "Exame de Requisitos"
  When the teacher asks the system to grade the open questions in the exam "Exame de Requisitos"
  And the teacher selects the model "Gemini 2.5 Flash"
  And the teacher confirms the selection
  Then the system initiates the exam correction process
  And a feedback message appears informing that the process was started with "Gemini 2.5 Flash"
  And the feedback message includes the estimated correction completion time.

  @gui @ai-correction
  Scenario: Attempt to Confirm Without Selecting Any Model
  Given teacher "Paulo" is viewing the exam "Exame de Requisitos"
  When the teacher asks the system to grade the open questions in the exam "Exame de Requisitos" without selecting any model
  Then the system displays a validation error message "Você deve selecionar um modelo de IA para continuar"
  And the correction process is not initiated
  
  @gui @ai-correction
  Scenario: Failure When Exam Has No Responses
    Given teacher "Paulo" is viewing the exam "Refatoração"
    And the exam "Refatoração" has no responses
    When the teacher asks the system to grade the open questions in the exam "Refatoração"
    And the teacher selects the model "Gemini 2.5 Flash"
    And the teacher confirms the selection
    Then the system displays an error message "Nenhuma resposta encontrada para este exame"
    And the correction process is not initiated

  @gui @ai-correction @unit
  Scenario: Successful opening the popup to select the model
    Given teacher "Paulo" is viewing the exam "Exame de Requisitos"
    When the teacher asks the system to grade the open questions in the exam "Exame de Requisitos"
    Then the system opens the popup to select the model
    And the popup to select the model is visible