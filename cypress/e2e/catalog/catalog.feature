# @C tags are TestRail case ids (C1001..C1012 are placeholders until the cases exist - see README "TestRail").
Feature: Catalog

  Scenario Outline: A standard customer sees pizza prices localized for their market
    When a standard customer browses the catalog in the <market> market
    Then the prices should show in <currency>

    @C1003
    Examples: United States
      | market        | currency   |
      | United States | US dollars |

    @C1004
    Examples: Mexico
      | market | currency      |
      | Mexico | Mexican pesos |

    @C1005
    Examples: Switzerland
      | market      | currency    |
      | Switzerland | Swiss francs |

    @C1006
    Examples: Japan
      | market | currency     |
      | Japan  | Japanese yen |

    @C1007
    Examples: Saudi Arabia
      | market       | currency     |
      | Saudi Arabia | Saudi riyals |
