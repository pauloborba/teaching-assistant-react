Feature: Class Comparison
  As a user
  I want to compare classes
  So that I can analyze their performance and enrollment data

  Scenario: Comparison request rejected due to insufficient number of classes
    Given the client sends a request to compare only one class, "ESS"
    When the server validates the comparison request
    Then the server returns HTTP 400
    And the response body contains an error message indicating that at least two classes are required for comparison


  Scenario: Exceeded maximum number of classes in comparison request
    Given the client sends a request to compare 7 classes
    When the server validates the request
    Then the server returns HTTP 400
    And the response body contains an error stating that the maximum number of classes allowed for comparison is 6
    And the request is not processed