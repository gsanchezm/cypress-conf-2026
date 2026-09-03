import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RunSummary } from '../RunObserver';
import { addResultsRequest, addRunRequest, closeRunRequest, elapsedOf, mapResults, runName } from './requests';

const summary: RunSummary = {
  startedAt: '2026-09-02T10:00:00.000Z',
  finishedAt: '2026-09-02T10:01:30.000Z',
  browser: 'chrome 140.0.0.0',
  cypressVersion: '15.21.0',
  labels: { UI_STRATEGY: 'deterministic' },
  screenshots: [],
  attemptsByTitle: { 'Authentication > A locked-out customer cannot log in': 2 },
  results: [
    { specPath: 'cypress/e2e/auth/auth.feature', title: 'Authentication > A standard customer logs in successfully', state: 'passed', durationMs: 842, slice: 'auth' },
    { specPath: 'cypress/e2e/auth/auth.feature', title: 'Authentication > A locked-out customer cannot log in', state: 'passed', durationMs: 1200, slice: 'auth' },
    { specPath: 'cypress/e2e/auth/auth.feature', title: 'Authentication > A pending scenario', state: 'pending', durationMs: 0, slice: 'auth' },
  ],
};

const caseMap = new Map([
  ['cypress/e2e/auth/auth.feature::A standard customer logs in successfully', 1001],
  ['cypress/e2e/auth/auth.feature::A locked-out customer cannot log in', 1002],
  ['cypress/e2e/auth/auth.feature::A pending scenario', 1003],
]);

test('mapResults keeps tagged passed/failed results with their case and status ids, dropping pending ones', () => {
  const mapped = mapResults(summary, caseMap).map(({ caseId, statusId }) => [caseId, statusId]);
  assert.deepEqual(mapped, [[1001, 1], [1002, 4]]);
});

test('addRunRequest creates a custom-selection run with sorted distinct case ids and the suite id', () => {
  const request = addRunRequest({ projectId: 7, suiteId: 3 }, summary, [1002, 1001, 1002]);
  const body = request.body as { include_all: boolean; case_ids: number[]; suite_id: number };
  assert.deepEqual([request.method, body.include_all, body.case_ids, body.suite_id], ['add_run/7', false, [1001, 1002], 3]);
});

test('addRunRequest omits suite_id for single-suite projects', () => {
  const request = addRunRequest({ projectId: 7 }, summary, [1001]);
  assert.equal('suite_id' in (request.body as object), false);
});

test('runName carries the slices, start time, browser and labels', () => {
  assert.equal(runName(summary), 'cypress-conf-2026 auth 2026-09-02T10:00:00.000Z (chrome 140.0.0.0) [UI_STRATEGY=deterministic]');
});

test('addResultsRequest builds one bulk entry per mapped result with a comment and elapsed time', () => {
  const request = addResultsRequest(42, mapResults(summary, caseMap), summary);
  assert.deepEqual(request, {
    method: 'add_results_for_cases/42',
    body: {
      results: [
        { case_id: 1001, status_id: 1, comment: 'passed in 842 ms on chrome 140.0.0.0 - Cypress 15.21.0', elapsed: '1s' },
        { case_id: 1002, status_id: 4, comment: 'passed in 1200 ms on chrome 140.0.0.0 - Cypress 15.21.0 (attempts: 2)', elapsed: '1s' },
      ],
    },
  });
});

test('elapsedOf never emits 0s, which TestRail rejects', () => {
  assert.equal(elapsedOf(0), '1s');
});

test('closeRunRequest targets the run id with an empty body', () => {
  assert.deepEqual(closeRunRequest(42), { method: 'close_run/42', body: {} });
});
