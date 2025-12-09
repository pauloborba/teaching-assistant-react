Feature: Exam registration and management via user interface
  As a professor
  I want to register exams with rules
  So that I can generate individual versions for enrolled students

  @gui @create-exam
  Scenario: Register exam
    Given professor "Paulo" accesses the screen Exam
    And open the popup "exam-popup"
    When the professor provides the title "Requisitos"
    And selects the questions "1" and "2" and "3" and "4" and "5"
    And confirms the exam registration
    Then the system registers the exam "Requisitos" successfully
    And displays the message "Provas geradas com sucesso!"

  @gui @create-exam
  Scenario: Register exam with no questions
    Given professor "Paulo" accesses the screen Exam
    And open the popup "exam-popup"
    When the professor provides the title "Requisitos"
    And selects no questions
    And confirms the exam registration
    Then the system still shows the popup "exam-popup"

  @gui @create-exam
  Scenario: Delete an exam
    Given professor "Paulo" accesses the screen Exam
    And open the popup "exam-popup"
    And registers the exam "Gestao de Projetos" with questions "1" and "2" and "3" and "4" and "5"
    When professor "Paulo" deletes the exam "Gestao de Projetos"
    Then the system shows the message "Exame deletado com sucesso!"
    And the exam "Gestao de Projetos" is no longer in the list of registered exams

  @gui @create-exam
  Scenario: List of exams in a class
    Given professor "Paulo" accesses the screen Exam
    And class "Engenharia de Software e Sistemas-2025-1" has exams "Exame de Requisitos" and "Gerência de Configuração" registered
    When professor "Paulo" selects the list of exams of the class "Engenharia de Software e Sistemas-2025-1"
    Then the system shows the list of exams "Exame de Requisitos" and "Gerência de Configuração"

  @gui @unit @create-exam
  Scenario: Create an exam button shows a popup
    Given professor "Paulo" accesses the screen Exam
    When the professor uses "open-create-exam"
    Then popup "exam-popup" should be visible
