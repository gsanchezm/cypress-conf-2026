Feature: Checkout

  @C8
  Scenario Outline: A standard customer completes an order in <Market>
    Given a standard customer with a pizza in their cart in <Market>
    When they complete checkout with their <Field>
    Then the order should be confirmed

    Examples: United States
      | Market | Field |
      | United States | zip code |

    Examples: Mexico
      | Market | Field |
      | Mexico | neighborhood |

    Examples: Switzerland
      | Market | Field |
      | Switzerland | postal code |

    Examples: Japan
      | Market | Field |
      | Japan | prefecture |

    Examples: Saudi Arabia
      | Market | Field |
      | Saudi Arabia | district |
