import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toStatusId } from './statusMap';

test('a passed test maps to TestRail Passed (1)', () => {
  assert.equal(toStatusId('passed', 1), 1);
});

test('a test that passed only after a retry maps to Retest (4)', () => {
  assert.equal(toStatusId('passed', 2), 4);
});

test('a failed test maps to Failed (5)', () => {
  assert.equal(toStatusId('failed', 3), 5);
});

test('pending and skipped tests are not submitted, so they stay Untested', () => {
  assert.deepEqual([toStatusId('pending'), toStatusId('skipped')], [undefined, undefined]);
});
