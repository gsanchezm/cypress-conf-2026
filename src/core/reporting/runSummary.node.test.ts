import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCompletedRun, joinTitle, toRunMetadata } from './runSummary';

// Only the fields toRunMetadata reads; the real object carries ~30 more (config, totals, ...).
const completedRun = {
  startedTestsAt: '2026-09-02T10:00:00.000Z',
  endedTestsAt: '2026-09-02T10:01:30.000Z',
  browserName: 'chrome',
  browserVersion: '140.0.0.0',
  cypressVersion: '15.21.0',
  runs: [
    {
      screenshots: [{ path: 'C:/proj/cypress/screenshots/auth.feature/Authentication -- A locked-out customer cannot log in (failed).png' }],
      tests: [
        { title: ['Authentication', 'A standard customer logs in successfully'], state: 'passed', duration: 842, attempts: [{ state: 'passed' }] },
        { title: ['Authentication', 'A locked-out customer cannot log in'], state: 'passed', duration: 1200, attempts: [{ state: 'failed' }, { state: 'passed' }] },
      ],
    },
  ],
} as unknown as CypressCommandLine.CypressRunResult;

test('isCompletedRun rejects the undefined results cypress open hands to after:run', () => {
  assert.equal(isCompletedRun(undefined), false);
});

test('isCompletedRun rejects a failed-to-start result, which has no runs', () => {
  const failed = { status: 'failed', failures: 1, message: 'Could not find any specs' } as CypressCommandLine.CypressFailedRunResult;
  assert.equal(isCompletedRun(failed), false);
});

test('joinTitle joins the describe/it titles with the separator after:spec uses', () => {
  assert.equal(joinTitle(['Authentication', 'A standard customer logs in successfully']), 'Authentication > A standard customer logs in successfully');
});

test('toRunMetadata keeps only string-valued expose entries as labels', () => {
  const metadata = toRunMetadata(completedRun, { UI_STRATEGY: 'cyPrompt', apiUrl: 'https://omnipizza-backend.onrender.com', retries: 2, nested: { a: 1 } });
  assert.deepEqual(metadata.labels, { UI_STRATEGY: 'cyPrompt', apiUrl: 'https://omnipizza-backend.onrender.com' });
});

test('toRunMetadata records the attempt count per joined title', () => {
  const metadata = toRunMetadata(completedRun, {});
  assert.deepEqual(metadata.attemptsByTitle, {
    'Authentication > A standard customer logs in successfully': 1,
    'Authentication > A locked-out customer cannot log in': 2,
  });
});

test('toRunMetadata flattens every screenshot path of the run', () => {
  const metadata = toRunMetadata(completedRun, {});
  assert.deepEqual(metadata.screenshots, ['C:/proj/cypress/screenshots/auth.feature/Authentication -- A locked-out customer cannot log in (failed).png']);
});

test('toRunMetadata composes the browser string from name and version', () => {
  assert.equal(toRunMetadata(completedRun, {}).browser, 'chrome 140.0.0.0');
});
