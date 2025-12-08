Feature: Business rules for exam creation and generation
  As a professor
  I want the system to manage exams based on rules
  So that I can generate traceable individual versions for enrolled students

  @service
  Scenario: Registering an exam
    Given the system receives a request to register the exam "Requisitos"
    And the rules define "2 open questions" and "3 closed questions"
    And the question bank contains enough questions to satisfy these rules
    When the system validates the rules
    Then the system creates the exam "Requisitos" with the associated rules
    And the exam "Requisitos" becomes available for the generation of individual versions

  @service
  Scenario: Deleting an exam
    Given the system receives a request to delete the exam "Requisitos"
    When the system validates the rules
    Then the system deletes the exam "Requisitos"
    And the exam "Requisitos" is no longer available for the generation of individual versions

  @service
  Scenario: Validation of inconsistent rules
    Given the request to create the exam "Gerência" specifies "20 open questions"
    And the question bank does not contain enough open questions
    When the system evaluates the defined rules
    Then the system rejects the creation of the exam "Gerência"
    And records the message "Insufficient questions to satisfy the defined rules"

  @service
  Scenario: Question selection according to rules
    Given exam "Requisitos" has rules defining "2 open questions" and "3 closed questions"
    And the system is generating an individual version for student "Vinícius"
    When the system selects the questions
    Then it chooses questions from the bank that match the type and quantity required by the rules
    And ensures that the selection strictly follows the criteria defined for the exam

  @service
  Scenario: Updating exam rules
    Given the exam "Requisitos" is already registered with rules
    When the rules are updated to "4 open questions" and "6 closed questions"
    Then the system records the new rules for the exam "Requisitos"
    And marks previously generated versions as outdated
    And allows future versions to be generated according to the updated rules

  @service
  Scenario: Retrieving all exams for a specific class
    Given the class "ESS" has exams "Requisitos" and "Gerência"
    When the system requests all exams for class "ESS"
    Then the system returns a list containing "Requisitos" and "Gerência"

  @service
  Scenario: Retrieving exams for a class that has no exams
    Given the class "NewClass" exists but has no exams registered
    When the system requests all exams for class "NewClass"
    Then the system returns an empty list
    And records the message "No exams found for the given class"

  @service
  Scenario: Creating an exam with missing required fields
    Given the request to create an exam is missing the "nomeProva" field
    When the system validates the rules
    Then the system rejects the creation of the exam
    And records the message "nomeProva is required"

  @service
  Scenario: Creating an exam with invalid question quantities
    Given the request to create the exam "InvalidExam" specifies "-1 open questions"
    When the system validates the rules
    Then the system rejects the creation of the exam "InvalidExam"
    And records the message "quantidadeAberta is required and must be a non-negative integer"

  @service
  Scenario: Creating an exam for a non-existent class
    Given the class "NonExistentClass" does not exist
    And the request to create the exam "Exam1" specifies class "NonExistentClass"
    When the system validates the rules
    Then the system rejects the creation of the exam "Exam1"
    And records the message "Turma NonExistentClass não encontrada"

  @service
  Scenario: Attempting to delete a non-existent exam
    Given the exam "999" does not exist
    When the system receives a request to delete the exam "999"
    Then the system returns an error indicating the exam was not found

  @service
  Scenario: Attempting to update a non-existent exam
    Given the exam "999" does not exist
    When the system receives a request to update the exam "999"
    Then the system returns an error indicating the exam was not found

