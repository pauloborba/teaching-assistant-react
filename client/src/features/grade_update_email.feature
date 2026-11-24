@grade-email
Feature: Daily email notifications for grade updates
  As a course professor
  I want the system to send at most one daily email notification when grades are updated
  So that students stay informed without receiving spam for every evaluation adjustment

  Scenario: Sending the first daily grade update notification
    Given student "João Silva" is enrolled in "Software Engineering"
    And no grade notification has been sent to "João Silva" today
    When the professor records grade "MA" for "João Silva" in "Software Engineering"
    Then grade "MA" is successfully stored in the system
    And a grade update email is sent to "João Silva"
    And the system records that a notification has already been sent to "João Silva" today

  Scenario: Preventing multiple grade emails on the same day
    Given student "Maria Souza" is enrolled in "Software Engineering"
    And a grade update email has already been sent to "Maria Souza" today
    When the professor updates "Maria Souza"'s grade in "Software Engineering" to "MA"
    Then grade "MA" is successfully stored in the system
    And no additional grade update email is sent to "Maria Souza"

  Scenario: Recording a grade for a student without an email address
    Given student "Pedro Alves" is enrolled in "Software Engineering"
    And student "Pedro Alves" has no email address registered
    When the professor records grade "MPA" for "Pedro Alves" in "Software Engineering"
    Then grade "MPA" is successfully stored in the system
    And no grade update email is sent
    And the system displays an alert that the student has no email address

  Scenario: Correcting a grade after the daily notification was sent
    Given student "Ana Costa" is enrolled in "Software Engineering"
    And grade "MANA" was recorded for "Ana Costa" today
    And a grade update email has already been sent to "Ana Costa" today
    When the professor changes "Ana Costa"'s grade from "MANA" to "MA" in "Software Engineering"
    Then "Ana Costa"'s grade is updated to "MA" in the system
    And no additional grade update email is sent to "Ana Costa"

  Scenario: Keeping notifications independent between students
    Given students "Lucas Mendes" and "Carla Dias" are enrolled in "Software Engineering"
    And a grade update email has already been sent to "Lucas Mendes" today
    And no grade notification has been sent to "Carla Dias" today
    When the professor records grade "MA" for "Carla Dias" in "Software Engineering"
    Then grade "MA" is successfully stored in the system
    And a grade update email is sent to "Carla Dias"
    And "Lucas Mendes"'s notification status remains unchanged
