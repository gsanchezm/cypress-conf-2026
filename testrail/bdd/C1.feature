Feature: Authentication

  @C1
  Scenario: A standard customer logs in successfully
    Given a standard customer
    When they log in
    Then they should land on the catalog page as an authenticated customer
