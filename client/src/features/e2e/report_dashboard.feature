@gui-report
Feature: Report Dashboard

  As a professor
  I want to view class performance reports
  So that I can analyze student performance visually

  Background:
    Given the teacher dashboard is accessible

  @critical
  Scenario: Report modal displays all layout components
    Given a class exists with "5" enrolled students
    And I am on the Classes page
    When I click the "Report" button for this class
    Then the "Report Modal" should be visible
    And I should see the following sections:
      | Enrollment Statistics           |
      | Student Status Distribution     |
      | Evaluation Performance          |
      | Students List                   |

  @visual @data-integrity
  Scenario: Null grades are displayed as hyphens
    Given a class exists with a student who has "no evaluations"
    And I open the report for this class
    Then the grade cell for this student should display "–"
    And no cell should display "NaN" or "undefined"

  @visual @empty-state
  Scenario: Empty class displays "No Data" state
    Given a class exists with "0" students
    And I open the report for this class
    Then the enrollment count should be "0"
    And I should see the "No Data Available" illustration
    And the charts should render in empty state mode

  @chart-data @pie-chart
  Scenario: Pie Chart renders correct segments based on status
    Given a class exists with:
      | status   | count |
      | Approved | 1     |
      | Failed   | 1     |
    When I open the report for this class
    And I inspect the "Student Status Distribution" chart
    Then I should see exactly "2" distinct chart segments
    And the legend should display "Approved" and "Failed"

  @chart-data @bar-chart
  Scenario: Bar Chart tooltip matches the data
    Given a class exists where the "Tests" goal has an average of "10.0"
    When I open the report for this class
    And I hover over the "Tests" bar in the "Evaluation Performance" chart
    Then the chart tooltip should display "Average: 10.0"

  @interaction
  Scenario: Closing the modal returns to Class List
    Given a class exists with students
    And I open the report for this class
    When I click the "Close" button
    Then the report modal should disappear
    And I should see the "Classes Table"

  @visual @style
  Scenario: Student status indicators use semantic colors
    Given a class exists with students of mixed statuses
    When I open the report for this class
    Then "Approved" students should have a "Green" indicator
    And "Failed" students should have a "Red" indicator
    And "Pending" students should have an "Orange" indicator