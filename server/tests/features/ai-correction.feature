Feature: Open Question Grading
  As a teacher
  I want to grade open questions using an AI model
  So that I can save time and improve the accuracy of the grades

  Scenario: Successful Initiation with Model Selection
  Given teacher "Paulo" is viewing the exam "Requisitos"
  When the teacher asks the system to grade the open questions in the exam "Requisitos"
  And the teacher selects the model "Gemini 2.5 Flash"
  Then the system initiates the exam correction process
  And a feedback message appears informing that the process was started with "Gemini 2.5 Flash"
  And the feedback message includes the estimated correction completion time.

  Scenario: Attempt to Confirm Without Selecting Any Model
  Given teacher "Paulo" is viewing the exam "Requisitos"
  When the teacher asks the system to grade the open questions in the exam "Requisitos" without selecting any model
  Then the system displays a validation error message "Você deve selecionar um modelo de IA para continuar"
  And the correction process is not initiated

  Scenario: Failure Alert During Correction Initiation
  Given teacher "Paulo" is viewing the exam "Requisitos"
  When the teacher asks the system to grade the open questions in the exam "Requisitos"
  And the teacher selects the model "Gemini 2.5 Flash"
  And the system fails to initiate the correction process
  Then the system displays a failure alert "Erro ao iniciar a correção. Por favor, tente novamente."
  And the correction process is not initiated