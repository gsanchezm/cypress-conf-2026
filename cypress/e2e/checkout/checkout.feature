# @C tags are real TestRail case IDs in project 1 (see README "TestRail").
Feature: Checkout

  @C8
  Scenario Outline: A standard customer completes an order in <Market>
    Given a standard customer with a pizza in their cart in <Market>
    When they complete checkout with their <Field>
    Then the order should be confirmed

    @market_us
    Examples: United States
      | Market        | Field    |
      | United States | zip code |

    @market_mx
    Examples: Mexico
      | Market | Field        |
      | Mexico | neighborhood |

    @market_ch
    Examples: Switzerland
      | Market      | Field       |
      | Switzerland | postal code |

    @market_jp
    Examples: Japan
      | Market | Field      |
      | Japan  | prefecture |

    @market_sa
    Examples: Saudi Arabia
      | Market       | Field    |
      | Saudi Arabia | district |
