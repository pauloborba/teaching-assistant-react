Feature: Business rules for exam creation and generation
  As a professor
  I want the system to manage exams based on rules
  So that I can generate traceable individual versions for enrolled students

  @service
  Scenario: Registering an exam
    Given the system receives a request to register the exam "Requisitos" in the class "Engenharia de Software e Sistemas-2025-1"
    And the request contains the questions "1" and "2" and "3" and "4" and "5"
    When the system validates the rules
    Then the system creates the exam "Requisitos" with the questions "1" and "2" and "3" and "4" and "5"
    And the exam "Requisitos" becomes available for the generation of individual versions

  @service
  Scenario: Deleting an exam
    Given the system receives a request to delete the exam "Gestao de Projetos" from the class "Engenharia de Software e Sistemas-2025-1"
    When the system validates the rules
    Then the system deletes the exam "Gestao de Projetos"
    And the exam "Gestao de Projetos" is no longer available for the generation of individual versions

  @service
  Scenario: Retrieving all exams for a specific class
    Given the class "Engenharia de Software e Sistemas-2025-1" has exams "Requisitos" and "Gerência"
    When the system requests all exams for class "Engenharia de Software e Sistemas-2025-1"
    Then the system returns a list containing "Requisitos" and "Gerência"

  @service
  Scenario: Retrieving exams for a class that has no exams
    Given the class "Engenharia de Software e Sistemas-2024-1" exists but has no exams registered
    When the system requests all exams for class "Engenharia de Software e Sistemas-2024-1"
    Then the system returns an empty list
    And records the message "No exams found"

  @service
  Scenario: Creating an exam with missing required fields
    Given the request to create an exam is missing the "nomeProva" field
    When the system validates the rules
    Then the system rejects the creation of the exam
    And records the message "nomeProva is required and must be a string"

  @service
  Scenario: Creating an exam for a non-existent class
    Given the class "Engenharia de Software e Sistemas-2026-1" does not exist
    And the request to create the exam "Exam1" specifies class "Engenharia de Software e Sistemas-2026-1"
    When the system validates the rules
    Then the system rejects the creation of the exam "Exam1"
    And records the message "Turma Engenharia de Software e Sistemas-2026-1 não encontrada"

  @service
  Scenario: Attempting to delete a non-existent exam
    Given the exam "999" does not exist
    And the request to delete the exam "999" specifies class "Engenharia de Software e Sistemas-2025-1"
    When the system validates the rules
    Then the system returns an error indicating the exam was not found
    And records the message "Prova 999 não encontrada"
