Feature: Catalog

  Scenario: A standard customer sees pizza prices in US dollars
    Given a standard customer
    When they browse the catalog in the United States market
    Then the prices should show in US dollars

  Scenario: A standard customer sees pizza prices in Japanese yen
    Given a standard customer
    When they browse the catalog in the Japan market
    Then the prices should show in Japanese yen
