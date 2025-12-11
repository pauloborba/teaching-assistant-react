Feature: Exam Service - Create Exam
    The exam service must validate data and create an exam correctly,
    ensuring internal rules even without depending on a real API or database.

    Scenario: Create an exam with valid data
        Given that a class with ID "Engenharia-2025" exists
        And a valid payload containing:
            | nomeProva         | Prova 1         |
            | classId           | Engenharia-2025 |
            | quantidadeAberta  | 2               |
            | quantidadeFechada | 3               |
            | questionIds       | 1,2,3,4,5       |
        When the service attempts to create the exam
        Then the exam is created successfully
        And the service returns an object containing:
            | title | Prova 1  |
            | id    | (any id) |
        And the question list should contain 1,2,3,4 and 5

    Scenario: Fail to create exam due to missing required field
        Given an invalid payload missing the "nomeProva" field
        When the service attempts to create the exam
        Then the service should throw the error "nomeProva is required"

    Scenario: Fail to create exam for a non-existent class
        Given that the class "Inexistente" does not exist in the system
        And a payload to create the exam:
            | nomeProva         | Prova 1     |
            | classId           | Inexistente |
            | quantidadeAberta  | 2           |
            | quantidadeFechada | 3           |
            | questionIds       | 1,2,3,4,5   |
        When the service attempts to create the exam
        Then the service should throw the error "Class not found"
