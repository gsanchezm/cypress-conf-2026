# @C tags are real TestRail case IDs in project 1 (see README "TestRail").
Feature: Catalog

  Scenario Outline: A standard customer sees pizza prices localized for their market
    When a standard customer browses the catalog in the <market> market
    Then the prices should show in <currency>

    @C3
    Examples: United States
      | market        | currency   |
      | United States | US dollars |

    @C4
    Examples: Mexico
      | market | currency      |
      | Mexico | Mexican pesos |

    @C5
    Examples: Switzerland
      | market      | currency    |
      | Switzerland | Swiss francs |

    @C6
    Examples: Japan
      | market | currency     |
      | Japan  | Japanese yen |

    @C7
    Examples: Saudi Arabia
      | market       | currency     |
      | Saudi Arabia | Saudi riyals |
