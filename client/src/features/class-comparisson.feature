@gui
Feature: Class Comparison

  Scenario: Successful class selection for comparison
    Given I am on the "Class" page
    And I have selected the class "ESS" for comparison
    And I have selected the class "MD" for comparison
    And both classes have students enrolled
    When I choose to compare the classes
    Then the "Class Performance Comparison" pops up
    And I see the comparison displayed in a table

  Scenario: Unsuccessful comparison attempt due to insufficient number of classes
    Given I am on the "Class" page
    And I have selected only the class "ESS" for comparison
    When I attempt to compare the selected class
    Then I am not allowed to compare the classes
    And I remain on the "Class" page

  Scenario: Unsuccessful comparison attempt due to missing class data
    Given I am on the "Class" page
    And I have selected the class "ESS" for comparison
    And I have selected the class "MD2" for comparison
    When I attempt to compare these classes
    And the class "MD2" has no enrolled students
    Then I receive a message stating that the class "MD2" and n others have no enrolled students
    And I remain on the "Class" page

  Scenario: Unsuccessful comparison attempt due to exceeding the maximum number of classes
    Given I am on the "Class" page
    And I have selected the class "ESS1" for comparison
    And I have selected the class "MD2" for comparison
    And I have selected the class "ESS2" for comparison
    And I have selected the class "MD23" for comparison
    And I have selected the class "ESS3" for comparison
    And I have selected the class "MD22" for comparison
    When I attempt to select the class "MD3" for comparison
    Then I am not allowed to select more than 6 classes
    And I remain on the "Class Comparison" page

  Scenario: Exporting the comparison
    Given I am viewing the "Class Performance Comparison"
    And a comparison is currently displayed
    When I choose to export the comparison
    Then a file containing the comparison results is generated and downloaded
    And I remain on the "Class Performance Comparison" view

  Scenario: Successfully adding a class to the comparison
    Given I am on the "Class Performance Comparison" view
    And fewer than the maximum number of classes are currently selected
    When I choose to add a class
    And I select "MD3"
    Then "MD3" appears in the comparison
    And I remain on the "Class Performance Comparison" view

  Scenario: Unsuccessful attempt to add a class due to maximum limit reached
    Given I am on the "Class Performance Comparison" view
    And there are already 6 classes displayed
    When I attempt to add another class
    Then I am not allowed to add another class due to reaching the maximum limit
    And the same 6 classes remain on display
    And I remain on the "Class Performance Comparison" view

  Scenario: Successfully removing a class from the comparison
    Given I am on the "Class" page
    And the class "MD3" is included in the comparison
    When I choose to remove a class
    And I select "MD3"
    And I confirm the removal
    Then "MD3" no longer appears in the comparison
    And I remain on the "Class" page

  Scenario: Attempting to remove a class when only two classes remain
    Given I am on the "Class" page
    And only 2 classes are displayed
    When I choose to remove a class
    Then I receive a message asking whether I want to clear the display or keep the existing classes
    And I remain on the "Class" page

  Scenario: Clearing the comparison after attempting to remove classes
    Given I am on the "Class" page
    And I chose to remove the class "MD3"
    And there are now not enough classes for comparison
    And I receive a message asking whether I want to clear the display or keep the existing classes
    When I choose to clear the display
    Then the comparison graphs disappear
    And I remain on the "Class" page

  Scenario: Keeping the comparison after attempting to remove classes
    Given I am on the "Class" page
    And I chose to remove the class "MD3"
    And there are now not enough classes for comparison
    And I receive a message asking whether I want to clear the display or keep the existing classes
    When I choose to keep the classes
    Then the comparison graphs remain displayed
    And I remain on the "Class" page

  Scenario: Correct visualization of class performance
    Given I am on the "Class" page
    And the bar chart "Students Above Average" is displayed
    And the classes "MD3" and "MD1" appear on the chart
    And "MD3" has more students with grades above average than "MD1"
    Then the bar representing "MD3" is taller than the bar representing "MD1"
    And I remain on the "Class" page