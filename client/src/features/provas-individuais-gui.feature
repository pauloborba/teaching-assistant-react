Feature: Exam registration and management via user interface
  As a professor
  I want to register exams with rules
  So that I can generate individual versions for enrolled students

  @gui
  Scenario: Register exam
    Given professor "Paulo" accesses the screen "Exam Registration"
    When the professor provides the title "Requisitos"
    And selects the questions "1" and "2" and "3" and "4" and "5"
    And confirms the exam registration
    Then the system registers the exam "Requisitos" successfully
    And displays the message "Provas geradas com sucesso!"

  @gui
  Scenario: Delete an exam
    Given professor "Paulo" accesses the screen "Exam Registration"
    And registers the exam "Gestao de Projetos" with questions "1" and "2" and "3" and "4" and "5"
    When professor "Paulo" deletes the exam "Gestao de Projetos"
    Then the system shows the message "Exame deletado com sucesso!"
    And the exam "Gestao de Projetos" is no longer in the list of registered exams
