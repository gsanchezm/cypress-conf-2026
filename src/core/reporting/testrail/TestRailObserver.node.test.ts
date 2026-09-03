import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RunSummary } from '../RunObserver';
import { TestRailClient, type FetchLike } from './TestRailClient';
import type { TestRailConfig } from './TestRailConfig';
import { TestRailObserver, type TestRailObserverDeps } from './TestRailObserver';
import type { RunLogger } from './testrailLogger';

const feature = `Feature: Authentication

  @C1001
  Scenario: A standard customer logs in successfully
    Given a standard customer

  @C1002
  Scenario: A locked-out customer cannot log in
    Given a locked-out customer
`;

const summary: RunSummary = {
  startedAt: '2026-09-02T10:00:00.000Z',
  finishedAt: '2026-09-02T10:01:30.000Z',
  browser: 'chrome 140.0.0.0',
  cypressVersion: '15.21.0',
  labels: {},
  screenshots: ['C:/proj/cypress/screenshots/auth.feature/Authentication -- A locked-out customer cannot log in (failed).png'],
  attemptsByTitle: {},
  results: [
    { specPath: 'cypress/e2e/auth/auth.feature', title: 'Authentication > A standard customer logs in successfully', state: 'passed', durationMs: 842, slice: 'auth' },
    { specPath: 'cypress/e2e/auth/auth.feature', title: 'Authentication > A locked-out customer cannot log in', state: 'failed', durationMs: 1200, slice: 'auth' },
  ],
};

const config: TestRailConfig = { url: 'https://acme.testrail.io', user: 'qa@acme.example', apiKey: 'k3y', projectId: 7, attachScreenshots: false, dryRun: false };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function harness(responses: Response[], overrides: Partial<TestRailConfig> = {}, featureSource = feature) {
  const methods: string[] = [];
  const errors: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    methods.push(url.split('/api/v2/')[1] ?? url);
    return responses.shift() ?? jsonResponse({}, 500);
  };
  const logger: RunLogger = { info: () => {}, error: (_context, message) => { errors.push(message); } };
  const deps: TestRailObserverDeps = {
    client: new TestRailClient(config, { fetch: fetchImpl, sleep: async () => {} }),
    logger,
    projectRoot: 'C:/proj',
    readText: async () => featureSource,
    readBinary: async () => new Uint8Array([137, 80, 78, 71]),
  };
  return { methods, errors, observer: new TestRailObserver({ ...config, ...overrides }, deps) };
}

test('onRunComplete posts exactly add_run, add_results_for_cases, close_run, in that order', async () => {
  const { methods, observer } = harness([jsonResponse({ id: 42 }), jsonResponse([{ id: 1 }, { id: 2 }]), jsonResponse({})]);

  await observer.onRunComplete(summary);

  assert.deepEqual(methods, ['add_run/7', 'add_results_for_cases/42', 'close_run/42']);
});

test('with TESTRAIL_ATTACH the failed result gets its screenshot attached before the run is closed', async () => {
  const { methods, observer } = harness(
    [jsonResponse({ id: 42 }), jsonResponse([{ id: 1 }, { id: 2 }]), jsonResponse({ attachment_id: 9 }), jsonResponse({})],
    { attachScreenshots: true },
  );

  await observer.onRunComplete(summary);

  assert.deepEqual(methods, ['add_run/7', 'add_results_for_cases/42', 'add_attachment_to_result/2', 'close_run/42']);
});

test('a run whose scenarios carry no @C tags sends nothing', async () => {
  const { methods, observer } = harness([], {}, 'Feature: Authentication\n\n  Scenario: A standard customer logs in successfully\n    Given a standard customer\n');

  await observer.onRunComplete(summary);

  assert.deepEqual(methods, []);
});

test('an API failure is logged and swallowed so the Cypress exit code is untouched', async () => {
  const { errors, observer } = harness([jsonResponse({ error: 'Invalid or unknown project' }, 400)]);

  await observer.onRunComplete(summary);

  assert.deepEqual(errors, ['TestRail: reporting failed - the Cypress exit code is unaffected']);
});
