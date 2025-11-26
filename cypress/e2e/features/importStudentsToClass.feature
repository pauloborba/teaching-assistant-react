Feature: As a professor
         I want to enroll students in a class by uploading a spreadsheet file (.csv or .xlsx) containing their CPFs
         So that I can quickly populate a large class without having to add each student manually.

Scenario: Import succeeds completely
    Given I am logged in as a teacher and on the "Classes" page
    And the system has the class "Class A" with no enrolled students
    And the system has registered students with IDs "11111122222" and "33333444444"
    When I upload a file "alunos.csv" containing IDs "11111122222" and "33333444444"
    Then I am redirected to the "Success" screen
    And the screen shows the message "Import completed: 2 students were imported successfully and 0 were rejected"
    And when I return to the "Class A" student list, students "11111122222" and "33333444444" are listed
