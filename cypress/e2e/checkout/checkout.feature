Feature: Checkout

  Scenario: A standard customer completes an order in the United States
    Given a standard customer with a pizza in their cart in the United States
    When they complete checkout with their zip code
    Then the order should be confirmed

  Scenario: A standard customer completes an order in Mexico
    Given a standard customer with a pizza in their cart in Mexico
    When they complete checkout with their neighborhood
    Then the order should be confirmed
