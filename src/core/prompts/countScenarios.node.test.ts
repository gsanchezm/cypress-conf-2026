import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countScenarios } from './countScenarios';

const OUTLINE = `Feature: Checkout

  Scenario Outline: A standard customer completes an order in <Market>
    Given a standard customer in <Market>
    Then the order should be confirmed

    Examples:
      | Market        | Field        |
      | United States | zip code     |
      | Mexico        | neighborhood |
`;

test('a scenario outline counts one scenario per examples row', () => {
  assert.equal(countScenarios(OUTLINE), 2);
});

test('plain scenarios count one each', () => {
  assert.equal(
    countScenarios('Feature: A\n\n  Scenario: one\n    Given x\n\n  Scenario: two\n    Given y\n'),
    2,
  );
});

test('plain scenarios and outlines add up', () => {
  assert.equal(countScenarios(`${OUTLINE}\n  Scenario: a plain one\n    Given z\n`), 3);
});

test('an outline with two examples blocks counts both', () => {
  assert.equal(
    countScenarios(`${OUTLINE}\n    Examples:\n      | Market | Field      |\n      | Japan  | prefecture |\n`),
    3,
  );
});

test('a feature with no scenarios counts zero', () => {
  assert.equal(countScenarios('Feature: empty\n  Some prose mentioning Scenario in passing\n'), 0);
});
