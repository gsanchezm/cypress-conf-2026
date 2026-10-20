Feature: Authentication

  @C2
  Scenario: A locked-out customer cannot log in
    Given a locked-out customer
    When they attempt to log in
    Then they should see a locked-out account message
