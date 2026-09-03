import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TestResult } from './Observer';
import { escapeCell, renderSpecSummary, renderStrategyComparison, totalsOf } from './summaryMarkdown';

const passed: TestResult = {
  specPath: 'cypress/e2e/auth/auth.feature',
  title: 'A standard customer logs in successfully',
  state: 'passed',
  durationMs: 842,
  slice: 'auth',
  attempts: 1,
  labels: { UI_STRATEGY: 'deterministic' },
};
const failed: TestResult = {
  ...passed,
  title: 'Checkout > A | B',
  state: 'failed',
  durationMs: 3158,
  slice: 'checkout',
  attempts: 3,
  labels: { UI_STRATEGY: 'deterministic', BREAK_LOCATOR: 'checkout.address' },
  error: { name: 'AssertionError', message: 'Expected to find element: [data-cy-broken-locator="checkout.address"]' },
};

test('escapes pipes so a Gherkin title cannot break the table', () => {
  assert.equal(escapeCell('A | B'), 'A \\| B');
});

test('totals count passed, failed, other and summed duration', () => {
  assert.deepEqual(totalsOf([passed, failed, { ...passed, state: 'pending' }]), { tests: 3, passed: 1, failed: 1, other: 1, durationMs: 4842 });
});

test('the spec heading carries the slice and the run labels', () => {
  assert.match(renderSpecSummary([failed]), /^### checkout — deterministic, BREAK_LOCATOR=checkout\.address$/m);
});

test('the totals line reads as one bold sentence', () => {
  assert.match(renderSpecSummary([passed, failed]), /\*\*2 tests · 1 passed · 1 failed · 0 other · 4\.0 s\*\*/);
});

test('a failed row shows attempts and the classified cause', () => {
  assert.match(renderSpecSummary([failed]), /\| checkout \| deterministic \| Checkout > A \\\| B \| failed \| 3 \| 3158ms \| broken-locator \|/);
});

test('a passed row shows a dash in the cause column', () => {
  assert.match(renderSpecSummary([passed]), /\| auth \| deterministic \| A standard customer logs in successfully \| passed \| 1 \| 842ms \| – \|/);
});

test('the by-strategy table has one row per strategy with its mean duration', () => {
  const cyPrompt: TestResult = { ...passed, durationMs: 2000, labels: { UI_STRATEGY: 'cyPrompt' } };
  assert.match(renderStrategyComparison([passed, failed, cyPrompt]), /\| deterministic \| 2 \| 1 \| 1 \| 2\.0 s \|\n\| cyPrompt \| 1 \| 1 \| 0 \| 2\.0 s \|/);
});
