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