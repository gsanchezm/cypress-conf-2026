Feature: Catalog

  Scenario: A standard customer sees pizza prices in US dollars
    When a standard customer browses the catalog in the United States market
    Then the prices should show in US dollars

  Scenario: A standard customer sees pizza prices in Japanese yen
    When a standard customer browses the catalog in the Japan market
    Then the prices should show in Japanese yen
