Feature: Open Question Grading - GUI Test
  As a teacher
  I want to grade open questions using an AI model
  So that I can save time and improve the accuracy of the grades

  Scenario: Attempt to Confirm Without Selecting Any Model
  Given teacher "Paulo" is viewing the exam "Requisitos"
  When the teacher asks the system to grade the open questions in the exam "Requisitos" without selecting any model
  Then the system displays a validation error message "Você deve selecionar um modelo de IA para continuar"
  And the correction process is not initiated

