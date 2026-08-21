import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAtomicSteps } from './runAtomicSteps';

test('runs arrangeViaApi, then hydrateUi, then assertUi, in that order', () => {
  const callOrder: string[] = [];

  runAtomicSteps({
    arrangeViaApi: () => callOrder.push('arrangeViaApi'),
    hydrateUi: () => callOrder.push('hydrateUi'),
    assertUi: () => callOrder.push('assertUi'),
  });

  assert.deepEqual(callOrder, ['arrangeViaApi', 'hydrateUi', 'assertUi']);
});

test('calls each step exactly once', () => {
  let arrangeCalls = 0;
  let hydrateCalls = 0;
  let assertCalls = 0;

  runAtomicSteps({
    arrangeViaApi: () => {
      arrangeCalls += 1;
    },
    hydrateUi: () => {
      hydrateCalls += 1;
    },
    assertUi: () => {
      assertCalls += 1;
    },
  });

  assert.equal(arrangeCalls, 1);
  assert.equal(hydrateCalls, 1);
  assert.equal(assertCalls, 1);
});
