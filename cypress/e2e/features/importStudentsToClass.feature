Feature: As a professor
         I want to enroll students in a class by uploading a spreadsheet file (.csv or .xlsx) containing their CPFs
         So that I can quickly populate a large class without having to add each student manually.

Scenario: Import succeeds completely
    Given I am logged in as a teacher and on the "Classes" tab
    And the system has the class "Class A" with no enrolled students
    And the system has registered students with IDs "11111122222" and "33333444444"
    When I upload a file "alunos.csv" containing IDs "11111122222" and "33333444444"
    Then I am redirected to the "Success" screen
    And the screen shows the message "Import completed: 2 students were imported successfully and 0 were rejected"
    And when I return to the "Class A" student list, students "11111122222" and "33333444444" are listed

Scenario: Import into a non-empty class
    Given I am logged in as a teacher and on the "Classes" tab
    And the system has registered students with IDs "11111122222" and "33333444444"
    And the system has the class "Class A" registered
    And "Class A" already has the student with ID "11111122222"
    And the student with ID "33333444444" is not in "Class A"
    
    When I upload a file "alunos.csv" containing IDs "11111122222" (already in the class) and "33333444444" (new)
    
    Then I am redirected to the "Success" screen
    And the screen shows the message "Import completed: 1 student was imported successfully and 0 were rejected"
    And the "Class A" student list now contains both students "11111122222" and "33333444444"

Scenario: Import with an empty file
    Given I am logged in as a teacher and on the "Classes" tab
    When I try to upload a file "vazia.csv" that contains no data rows
    Then I am redirected to the "Error case" screen
    And the screen shows the error message: "The uploaded file is empty or not supported (only .xlsx or .csv allowed). Please upload a file with valid registration numbers."

Scenario: Partial import: registration not found in the student registry
    Given I am logged in as a teacher and on the "Classes" tab
    And the system has the class "Class A" with no enrolled students
    And the system has registered students with IDs "11111122222" and "33333444444"
    And the system has not registered a student with ID "09876543212"

    When I upload a file "alunos-1-Not-2.csv" containing IDs "11111122222", "09876543212" and "33333444444"

    Then I am redirected to the "Success" screen
    And the screen shows the summary "2 students imported successfully and 1 student rejected"
    And "Class A" now has students "11111122222" and "33333444444" enrolled

Scenario: Partial import: blank registration
    Given I am logged in as a teacher and on the "Classes" tab
    And the system has the student with ID "11111122222"
    And the system has the class "Class A" with no enrolled students

    When I upload a file "alunos-blank-1.csv" where row 1 has a blank registration line and row 2 contains ID "11111122222"

    Then I am redirected to the "Success" screen
    And the screen shows the summary "1 student imported successfully and 0 student rejected"
    And when I return to the "Class A" student list, student "11111122222" is listed

Scenario: Multiple columns file
    Given I am logged in as a teacher and on the "Classes" tab
    And the system has the student with ID "11111122222"
    And the system has the class "Class A" with no enrolled students

    When I upload a file "alunos-col.csv" where row 1 is "nome,cpf,login" and row 2 is "anyName,11111122222,anyLogin"

    Then I am redirected to the "Success" screen
    And the screen shows the summary "1 student imported successfully and 0 student rejected"
    And when I return to the "Class A" student list, student "11111122222" is listed
# Service-level scenarios testing REST API endpoints

Scenario: Get student by CPF via API
    Given the system has a student with CPF "11111111111", name "Paulo Borba" and email "phmb@cin.ufpe.br"
    When a "GET" request is sent to "/api/students/11111111111"
    Then the response status should be "200"
    And the response JSON should contain CPF "11111111111", name "Paulo Borba" and email "phmb@cin.ufpe.br"

Scenario: Get all classes via API
    Given the system has the following classes:
      | topic                                | semester | year |
      | Engenharia de Software e Sistemas    | 1        | 2025 |
      | Engenharia de Software e Sistemas    | 2        | 2025 |
    When a "GET" request is sent to "/api/classes"
    Then the response status should be "200"
    And the response JSON should be a list of classes
    And the class with topic "Engenharia de Software e Sistemas", semester "1" and year "2025" is in the list
    And the class with topic "Engenharia de Software e Sistemas", semester "2" and year "2025" is in the list

Scenario: Enroll student in class via API
    Given the system has a student with CPF "11111122222", name "Test Student" and email "test@test.com"
    And the system has a class with id "TestAPIClass-2025-1"
    And the student with CPF "11111122222" is not enrolled in class "TestAPIClass-2025-1"
    When a "POST" request is sent to "/api/classes/TestAPIClass-2025-1/enroll" with body containing studentCPF "11111122222"
    Then the response status should be "201"
    And the student with CPF "11111122222" should be enrolled in class "TestAPIClass-2025-1"
