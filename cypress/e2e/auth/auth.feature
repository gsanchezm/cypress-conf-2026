# @C tags are TestRail case ids (C1001..C1012 are placeholders until the cases exist - see README "TestRail").
Feature: Authentication

  @C1001
  Scenario: A standard customer logs in successfully
    Given a standard customer
    When they log in
    Then they should land on the catalog page as an authenticated customer

  @C1002
  Scenario: A locked-out customer cannot log in
    Given a locked-out customer
    When they attempt to log in
    Then they should see a locked-out account message
