import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDisplayError, screenshotsFor, sliceOf, toTestResults } from './afterSpecMapper';

const SPEC = 'cypress/e2e/checkout/checkout.feature';
const LABELS = { UI_STRATEGY: 'deterministic' };
const DISPLAY_ERROR =
  'AssertionError: Timed out retrying after 4000ms: Expected to find element: `[data-cy-broken-locator="checkout.address"]`, but never found it.\n\n    at Context.eval (webpack://x/./src/features/checkout/strategies/DeterministicCheckoutUiStrategy.ts:20:8)';
const SCREENSHOT = {
  path: 'C:/repo/cypress/screenshots/checkout.feature/Checkout -- A standard customer completes an order in Japan (failed).png',
};
const RETRY_SCREENSHOT = {
  path: 'C:/repo/cypress/screenshots/checkout.feature/Checkout -- A standard customer completes an order in Japan (failed) (attempt 2).png',
};
const failed = {
  title: ['Checkout', 'A standard customer completes an order in Japan'],
  state: 'failed',
  duration: 14210,
  displayError: DISPLAY_ERROR,
  attempts: [{ state: 'failed' }, { state: 'failed' }, { state: 'failed' }],
};
const passed = { title: ['Checkout', 'A standard customer completes an order in Mexico'], state: 'passed', duration: 9000, displayError: null, attempts: [{ state: 'passed' }] };

test('extracts the slice from the e2e folder name', () => {
  assert.equal(sliceOf('cypress\\e2e\\auth\\auth.feature'), 'auth');
});

test('parses the error name and message out of displayError, dropping the stack', () => {
  assert.deepEqual(parseDisplayError(DISPLAY_ERROR), {
    name: 'AssertionError',
    message: 'Timed out retrying after 4000ms: Expected to find element: `[data-cy-broken-locator="checkout.address"]`, but never found it.',
  });
});

test('parses an error without a name prefix as a plain Error', () => {
  assert.deepEqual(parseDisplayError('something exploded'), { name: 'Error', message: 'something exploded' });
});

test('returns undefined for an empty displayError', () => {
  assert.equal(parseDisplayError(null), undefined);
});

test('matches every screenshot whose file name starts with the test title, retries included', () => {
  assert.deepEqual(screenshotsFor(failed.title, [SCREENSHOT, RETRY_SCREENSHOT]), [SCREENSHOT.path, RETRY_SCREENSHOT.path]);
});

test('does not attribute another test\'s screenshot', () => {
  assert.deepEqual(screenshotsFor(passed.title, [SCREENSHOT]), []);
});

test('maps a failed test with error, attempts and screenshots', () => {
  const [result] = toTestResults(SPEC, { tests: [failed], screenshots: [SCREENSHOT] }, LABELS);
  assert.deepEqual(result, {
    specPath: SPEC,
    title: 'Checkout > A standard customer completes an order in Japan',
    state: 'failed',
    durationMs: 14210,
    slice: 'checkout',
    attempts: 3,
    screenshots: [SCREENSHOT.path],
    labels: LABELS,
    error: {
      name: 'AssertionError',
      message: 'Timed out retrying after 4000ms: Expected to find element: `[data-cy-broken-locator="checkout.address"]`, but never found it.',
    },
  });
});

test('maps a passed test with no error', () => {
  const [result] = toTestResults(SPEC, { tests: [passed], screenshots: [] }, LABELS);
  assert.equal(result?.error, undefined);
});

test('maps an undefined payload (open mode) to no rows', () => {
  assert.deepEqual(toTestResults(SPEC, undefined, LABELS), []);
});
