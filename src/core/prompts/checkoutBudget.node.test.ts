import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePromptDocument } from './preparePrompt';
import { countScenarios } from './countScenarios';
import {
  executionsPerRun,
  promptCallsPerScenario,
  runsPerMonth,
  STARTER_PLAN_EXECUTIONS_PER_MONTH,
} from './promptBudget';

// The number the README and slide 18 quote, computed from the shipped files
// rather than typed in: if someone adds a market or a third prompt section,
// this test moves and the docs are visibly stale.
const promptDocument = parsePromptDocument(
  readFileSync(new URL('../../features/checkout/prompts/checkout.prompt.md', import.meta.url), 'utf8'),
);
const feature = readFileSync(
  new URL('../../../cypress/e2e/checkout/checkout.feature', import.meta.url),
  'utf8',
);

function shippedExecutionsPerRun(): number {
  return executionsPerRun({
    callsPerScenario: promptCallsPerScenario(promptDocument),
    scenarios: countScenarios(feature),
  });
}

test('the checkout suite costs exactly 10 cy.prompt executions per run (2 sections x 5 markets)', () => {
  assert.equal(shippedExecutionsPerRun(), 10);
});

test('the free Starter plan affords 10 full runs a month, rehearsals included', () => {
  assert.equal(
    runsPerMonth({ quota: STARTER_PLAN_EXECUTIONS_PER_MONTH, executionsPerRun: shippedExecutionsPerRun() }),
    10,
  );
});
