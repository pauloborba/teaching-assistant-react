Feature: Academic Status Identification by Color Border

  As a professor
  I want to visualize each student identified by a color border
  So that I can quickly understand the student's academic situation


  Scenario: Display of colors on the students list
    Given the system has a class "Software Engineering (2025/1)"
    And the class has a student "João da Silva" with average "8.5" and no previous failures
    And the class has a student "Maria de Souza" with average "4.0" and with previous failures
    When I access the "Students List" page of the class "Software Engineering (2025/1)"
    Then I should see the student "João da Silva" displayed with a "Green" border
    And I should see the student "Maria de Souza" displayed with a "Red" border


  Scenario: Green border when student average is greater than or equal to the class average
    Given the system has a class "Software Engineering (2025/1)"
    And the class has a student "João da Silva" with average "8.0" and no previous failures
    And the class has a student "Carlos Souza" with average "7.0" and no previous failures
    When I access the "Students List" page of the class "Software Engineering (2025/1)"
    Then I should see the student "João da Silva" displayed with a "Green" border


  Scenario: Yellow border when student average is up to 10% below the class average and without previous failures
    Given the system has a class "Software Engineering (2025/1)"
    And the class has a student "Carlos Souza" with average "6.5" and no previous failures
    And the class has a student "Ana Costa" with average "7.5" and no previous failures
    When I access the "Students List" page of the class "Software Engineering (2025/1)"
    Then I should see the student "Carlos Souza" displayed with a "Yellow" border


  Scenario: Red border when the student has previous failures
    Given the system has a class "Software Engineering (2025/1)"
    And the class has a student "Maria Lima" with average "7.9" and with previous failures
    And the class has a student "João da Silva" with average "8.1" and no previous failures
    When I access the "Students List" page of the class "Software Engineering (2025/1)"
    Then I should see the student "Maria Lima" displayed with a "Red" border


  Scenario: Red border when the student is more than 10% below the class average
    Given the system has a class "Software Engineering (2025/1)"
    And the class has a student "Pedro Alves" with average "5.5" and no previous failures
    And the class has a student "Ana Costa" with average "8.5" and no previous failures
    When I access the "Students List" page of the class "Software Engineering (2025/1)"
    Then I should see the student "Pedro Alves" displayed with a "Red" border


  Scenario: Automatic update from green to yellow when the student's average decreases
    Given the system has a class "Software Engineering (2025/1)"
    And the class has a student "Jose Silva" with average "8.0" and no previous failures
    And the class has a student "Maria Souza" with average "7.0" and no previous failures
    When the average of the student "Jose Silva" becomes "7.0"
    And I access the "Students List" page of the class "Software Engineering (2025/1)"
    Then the border of "Jose Silva" on the "Students List" should change from "Green" to "Yellow"


  Scenario: Automatic update to red when the student starts to have previous failures
    Given the system has a class "Software Engineering (2025/1)"
    And the class has a student "Ana Costa" with average "7.2" and no previous failures
    And the class has a student "João Lima" with average "7.8" and no previous failures
    When the student "Ana Costa" becomes marked as having previous failures
    And I access the "Students List" page of the class "Software Engineering (2025/1)"
    Then the border of "Ana Costa" on the "Students List" should change to "Red"