Feature: Checkout

  Scenario Outline: A standard customer completes an order in <Market>
    Given a standard customer with a pizza in their cart in <Market>
    When they complete checkout with their <Field>
    Then the order should be confirmed

    Examples:
      | Market         | Field        |
      | United States  | zip code     |
      | Mexico         | neighborhood |
      | Switzerland    | postal code  |
      | Japan          | prefecture   |
      | Saudi Arabia   | district     |
