Feature: Catalog

  Scenario Outline: A standard customer sees pizza prices localized for their market
    When a standard customer browses the catalog in the <market> market
    Then the prices should show in <currency>

    Examples:
      | market        | currency      |
      | United States | US dollars    |
      | Mexico        | Mexican pesos |
      | Switzerland   | Swiss francs  |
      | Japan         | Japanese yen  |
      | Saudi Arabia  | Saudi riyals  |
