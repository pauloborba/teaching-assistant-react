Feature: Exam response registration
    As a Student
    I want to register my responses to an exam through an interface
    So that my answers are recorded and can be evaluated later.

    Scenario: Successfully register answers for an ongoing exam
        Given I am logged in as a "Student"
        And an exam named "Prova1" is currently open for responses
        And I have filled all answers on the exam page
        When I click "Submit responses"
        Then I should see a confirmation message "Responses submitted successfully."
        And my answers should be saved in the system.

    Scenario: Attempt to submit incomplete responses
        Given I am logged in as a "Student"
        And an exam named "Prova2" is currently open
        And I have left at least one question unanswered
        When I click "Submit responses"
        Then I should be notified that "Please answer all questions before submitting."
        And the responses should not be submitted.

    Scenario: Attempt to submit responses after the exam has closed
        Given I am logged in as a "Student"
        And an exam named "Prova_final" has already closed
        When I attempt to submit my responses
        Then I should be notified that "Exam submission period has ended."
        And the responses should not be recorded.

    Scenario: API call to successfully submit exam responses
        Given a valid authentication token for a "Student" user
        And an exam exists with ID "exam-id-123" and is open for submission
        When the user sends a POST request to "/api/v1/exams/exam-id-123/responses"
        With a valid JSON body containing all answers
        Then the response status code should be 201
        And the response body should include the message: “Response submitted successfully”.

    Scenario: API call to submit responses without proper authorization (Forbidden)
        Given a valid authentication token for a "Professor" user
        And an exam exists with ID "exam-id-456"
        When the user sends a POST request to "/api/v1/exams/exam-id-456/responses"
        Then the response status code should be 403.