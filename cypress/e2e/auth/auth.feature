# @C tags are real TestRail case IDs in project 1 (see README "TestRail").
Feature: Authentication

  @C1
  Scenario: A standard customer logs in successfully
    Given a standard customer
    When they log in
    Then they should land on the catalog page as an authenticated customer

  @C2
  Scenario: A locked-out customer cannot log in
    Given a locked-out customer
    When they attempt to log in
    Then they should see a locked-out account message
