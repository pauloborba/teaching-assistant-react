Feature: Exam autocorrection service
    As a backend system
    I want to correct submitted exams
    So that grades are calculated and stored correctly

    @autocorrection-service
    Scenario: Autocorrecting closed questions in an exam
        Given student "12345678901" answered "a" and "b" for questions "1" and "2" respectively in exam "1"
        And the correct answers for those questions are "a" and "b"
        When the system autocorrects the exam "1"
        Then student "12345678901" is registered with grade "100" for exam "1"

    @autocorrection-service
    Scenario: Autocorrecting all students closed questions in an exam
        Given class "1" has students with CPFs "12345678901" and "12345678902"
        And student "12345678901" answered "1" and student "12345678902" answered "2" for question "1" in exam "2"
        And the correct answer for question "1" is "2"
        When the system autocorrects all tests in exam "2"
        Then student "12345678901" is registered with grade "0" for exam "2"
        And student "12345678902" is registered with grade "100" for exam "2"

    @autocorrection-service
    Scenario: Student did not answer all closed questions in an exam
        Given exam "1" has questions "1", "2" and "3"
        And correct answers are "a", "b" and "c"
        And student "12345678901" answered only "a" and "b" in exam "1"
        When the system autocorrects the exam "1"
        Then student "12345678901" is registered with grade "66.7" for exam "1"

    @autocorrection-service
    Scenario: Student did not answer the exam
        Given student "12345678903" did not submit any response for exam "1"
        When the system autocorrects exam "1"
        Then student "12345678903" has no grade record (status: not answered)

    @autocorrection-service
    Scenario: Teacher did not pass an exam to be corrected
        Given no exam is specified for correction
        When the system tries to autocorrect without exam
        Then the system returns an error indicating that no exam was selected

    @autocorrection-service
    Scenario: Exam was already corrected
        Given exam "1" was already corrected and has grades
        When the system tries to autocorrect exam "1" again
        Then the system returns a conflict error (exam already corrected)

    @autocorrection-service
    Scenario: Exam has no answer key
        Given exam "1" has questions "1" and "2"
        And there is no correct answer defined
        When the system tries to autocorrect exam "1"
        Then the system returns an error (missing answer key)

    @autocorrection-service
    Scenario: Exam does not exist
        Given exam "999" does not exist
        When the system tries to autocorrect exam "999"
        Then the system returns an error (exam not found)

    @autocorrection-service
    Scenario: No student submitted the exam
        Given exam "1" exists
        And no students submitted answers
        When the system autocorrects exam "1"
        Then no grades are updated

    @autocorrection-service
    Scenario: Retrieve submitted answers for an exam (ungraded)
        Given exam "1" has responses from students "12345678901" and "12345678902"
        And student "12345678901" answered "a" for question "1" in exam "1"
        And student "12345678902" answered "b" for question "1" in exam "1"
        When the system retrieves the answers for exam "1"
        Then the system returns a list with 2 student answers
        And the returned entries include student CPF "12345678901" and "12345678902"
        And names are resolved from student registry or shown as "Aluno não registrado" when missing

    @autocorrection-service
    Scenario: Retrieve submitted answers for an exam (after grading)
        Given exam "1" has responses from student "12345678901" with graded closed answers
        And the response record for student "12345678901" contains a closed grade of "85"
        When the system retrieves the answers for exam "1"
        Then the returned entry for student "12345678901" contains the closed grade "85"

    @autocorrection-service
    Scenario: Retrieve answers for non-existent exam
        Given exam "999" does not exist
        When the system retrieves the answers for exam "999"
        Then the system returns an error indicating "Exam not found"

    @autocorrection-service
    Scenario: Retrieve answers when no student submitted the exam
        Given exam "2" exists and no students submitted responses
        When the system retrieves the answers for exam "2"
        Then the system returns an empty list

    @autocorrection-service
    Scenario: Exam with mixed open and closed questions counts only closed toward grade
        Given exam "3" has questions "1", "2", "3" and "4"
        And questions "1", "2" and "3" are closed questions
        And question "4" is an open question
        And correct answers for closed questions are "a", "b" and "c"
        And student "12345678901" answered "a" for question "1", "b" for question "2", and "d" for question "3" in exam "3"
        And student "12345678901" answered "some text response" for the open question "4" in exam "3"
        When the system autocorrects the exam "3"
        Then student "12345678901" is registered with grade "66.7" for exam "3"
