Feature: Class Comparison
  As a user
  I want to compare classes
  So that I can analyze their performance and enrollment data

  Scenario: Successful class comparison request
    Given the client sends a request to compare the classes "ESS" and "MD"
    And both classes exist in the system
    And both classes have enrolled students
    When the server processes the comparison request
    Then the server returns HTTP 200
    And the response body contains the comparison data for "ESS" and "MD"

  Scenario: Comparison request rejected due to insufficient number of classes
    Given the client sends a request to compare only one class, "ESS"
    When the server validates the comparison request
    Then the server returns HTTP 400
    And the response body contains an error message indicating that at least two classes are required for comparison

  Scenario: Comparison request rejected due to classes with missing student data
    Given the client sends a request to compare the classes "ESS" and "MD2"
    And the class "MD2" has zero enrolled students
    When the server processes the comparison request
    Then the server returns HTTP 422
    And the response body contains an error message stating that "MD2" (and possibly other classes) have no enrolled students
    And no comparison data is returned

  Scenario: Exceeded maximum number of classes in comparison request
    Given the client sends a request to compare 7 classes
    When the server validates the request
    Then the server returns HTTP 400
    And the response body contains an error stating that the maximum number of classes allowed for comparison is 6
    And the request is not processed