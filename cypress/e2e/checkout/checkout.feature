# @C tags are TestRail case ids (C1001..C1012 are placeholders until the cases exist - see README "TestRail").
Feature: Checkout

  Scenario Outline: A standard customer completes an order in <Market>
    Given a standard customer with a pizza in their cart in <Market>
    When they complete checkout with their <Field>
    Then the order should be confirmed

    @C1008
    Examples: United States
      | Market        | Field    |
      | United States | zip code |

    @C1009
    Examples: Mexico
      | Market | Field        |
      | Mexico | neighborhood |

    @C1010
    Examples: Switzerland
      | Market      | Field       |
      | Switzerland | postal code |

    @C1011
    Examples: Japan
      | Market | Field      |
      | Japan  | prefecture |

    @C1012
    Examples: Saudi Arabia
      | Market       | Field    |
      | Saudi Arabia | district |
