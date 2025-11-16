Feature: Business rules for exam creation and generation
  As a professor
  I want the system to manage exams based on rules
  So that I can generate traceable individual versions for enrolled students

  @service
  Scenario: Registering an exam
    Given the system receives a request to register the exam "Requisitos"
    And the rules define "3 open questions" and "5 closed questions"
    And the question bank contains enough questions to satisfy these rules
    When the system validates the rules
    Then the system creates the exam "Requisitos" with the associated rules
    And the exam "Requisitos" becomes available for the generation of individual versions

  @service
  Scenario: Validation of inconsistent rules
    Given the request to create the exam "Gerência" specifies "20 open questions"
    And the question bank does not contain enough open questions
    When the system evaluates the defined rules
    Then the system rejects the creation of the exam "Gerência"
    And records the message "Insufficient questions to satisfy the defined rules"

  @service
  Scenario: Generation of individual versions
    Given the exam "Requisitos" is registered with valid rules
    And the class "ESS" has the enrolled students "Vinícius" and "Pedro"
    When the system is instructed to generate individual versions for the exam "Requisitos"
    Then the system creates a unique version for each student
    And assigns a unique identifier to each generated version
    And links the selected questions according to the rules of the exam "Requisitos"

  @service
  Scenario: Question selection according to rules
    Given exam "Requisitos" has rules defining "3 open questions" and "5 closed questions"
    And the system is generating an individual version for student "Vinícius"
    When the system selects the questions
    Then it chooses questions from the bank that match the type and quantity required by the rules
    And ensures that the selection strictly follows the criteria defined for the exam

  @service
  Scenario: Traceability of generated versions
    Given the exam "Requisitos" already has generated individual versions
    And the versions are associated with students "Vinícius" and "Pedro"
    When the system retrieves the generated versions
    Then it returns the identification information of each version (student, version ID, generation date)
    And allows tracking of the original exam "Requisitos" from which each version was generated

  @service
  Scenario: Updating exam rules
    Given the exam "Requisitos" is already registered with rules
    When the rules are updated to "4 open questions" and "6 closed questions"
    Then the system records the new rules for the exam "Requisitos"
    And marks previously generated versions as outdated
    And allows future versions to be generated according to the updated rules

  @service
  Scenario: Failure in generation
    Given exam "Requisitos" has rules that conflict with the number of questions available in the bank
    When the system attempts to generate individual versions
    Then the system stops the generation process
    And records the error message "Generation failed due to insufficient questions"