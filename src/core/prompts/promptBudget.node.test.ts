import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePromptDocument } from './preparePrompt';
import {
  executionsPerRun,
  promptCallsPerScenario,
  runsPerMonth,
  STARTER_PLAN_EXECUTIONS_PER_MONTH,
} from './promptBudget';

test('every cy.prompt call in every scenario is one billed execution', () => {
  assert.equal(executionsPerRun({ callsPerScenario: 2, scenarios: 5 }), 10);
});

test('runs per month is the whole number of runs the quota affords', () => {
  assert.equal(runsPerMonth({ quota: STARTER_PLAN_EXECUTIONS_PER_MONTH, executionsPerRun: 12 }), 8);
});

test('a suite that costs nothing is a wiring bug, not free money', () => {
  assert.throws(
    () => runsPerMonth({ quota: 100, executionsPerRun: 0 }),
    /executionsPerRun must be at least 1/,
  );
});

test('a negative scenario count is rejected', () => {
  assert.throws(
    () => executionsPerRun({ callsPerScenario: 2, scenarios: -1 }),
    /must not be negative/,
  );
});

test('one prompt section is one cy.prompt call per scenario', () => {
  assert.equal(promptCallsPerScenario(parsePromptDocument('## a\n\n- x\n\n## b\n\n- y\n')), 2);
});
