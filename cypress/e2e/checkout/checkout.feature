Feature: Checkout

  Scenario: A standard customer completes an order in the United States
    Given a standard customer with a pizza in their cart in the United States
    When they complete checkout with their zip code
    Then the order should be confirmed

  Scenario: A standard customer completes an order in Mexico
    Given a standard customer with a pizza in their cart in Mexico
    When they complete checkout with their neighborhood
    Then the order should be confirmed

  Scenario: A standard customer completes an order in Switzerland
    Given a standard customer with a pizza in their cart in Switzerland
    When they complete checkout with their postal code
    Then the order should be confirmed

  Scenario: A standard customer completes an order in Japan
    Given a standard customer with a pizza in their cart in Japan
    When they complete checkout with their prefecture
    Then the order should be confirmed

  Scenario: A standard customer completes an order in Saudi Arabia
    Given a standard customer with a pizza in their cart in Saudi Arabia
    When they complete checkout with their district
    Then the order should be confirmed
