import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TestResult } from './Observer';
import { describeResult } from './describeResult';

const passed: TestResult = {
  specPath: 'cypress/e2e/auth/auth.feature',
  title: 'A standard customer logs in successfully',
  state: 'passed',
  durationMs: 842,
  slice: 'auth',
};

test('a passed result keeps the one-line icon format', () => {
  assert.equal(describeResult(passed), '✅ [auth] A standard customer logs in successfully (842ms)');
});

test('a failed result appends attempts, cause and the error', () => {
  const failed: TestResult = {
    ...passed,
    state: 'failed',
    attempts: 3,
    error: { name: 'PreconditionError', message: 'Precondition not met: the login issued a token' },
  };
  assert.equal(
    describeResult(failed),
    '❌ [auth] A standard customer logs in successfully (842ms) · attempts 3 · cause precondition · PreconditionError: Precondition not met: the login issued a token',
  );
});

test('a long error message is truncated to keep the console line readable', () => {
  const failed: TestResult = { ...passed, state: 'failed', error: { name: 'AssertionError', message: 'x'.repeat(500) } };
  assert.match(describeResult(failed), /AssertionError: x{199}…$/);
});
