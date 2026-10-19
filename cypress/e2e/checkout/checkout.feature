# @C tags are real TestRail case IDs in project 1 (see README "TestRail").
Feature: Checkout

  Scenario Outline: A standard customer completes an order in <Market>
    Given a standard customer with a pizza in their cart in <Market>
    When they complete checkout with their <Field>
    Then the order should be confirmed

    @C8
    Examples: United States
      | Market        | Field    |
      | United States | zip code |

    @C9
    Examples: Mexico
      | Market | Field        |
      | Mexico | neighborhood |

    @C10
    Examples: Switzerland
      | Market      | Field       |
      | Switzerland | postal code |

    @C11
    Examples: Japan
      | Market | Field      |
      | Japan  | prefecture |

    @C12
    Examples: Saudi Arabia
      | Market       | Field    |
      | Saudi Arabia | district |
