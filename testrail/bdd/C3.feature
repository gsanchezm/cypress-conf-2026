Feature: Catalog

  @C3
  Scenario Outline: A standard customer sees pizza prices localized in <market>
    When a standard customer browses the catalog in the <market> market
    Then the prices should show in <currency>

    Examples: Markets
      | market | currency |
      | United States | US dollars |
      | Mexico | Mexican pesos |
      | Switzerland | Swiss francs |
      | Japan | Japanese yen |
      | Saudi Arabia | Saudi riyals |
