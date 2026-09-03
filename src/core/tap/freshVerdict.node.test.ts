import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyStatusPoll, type TapStatus } from './freshVerdict';

const SPEC = 'cypress/e2e/auth/auth.feature';
const BASELINE = '2026-09-02T10:00:00.000Z';
const passed: TapStatus = {
  status: 'passed',
  spec: SPEC,
  startedAt: '2026-09-02T10:05:00.000Z',
  totalTests: 2,
  results: { passed: 2, failed: 0, pending: 0, skipped: 0 },
};

test('a spec still loading means keep waiting', () => {
  assert.deepEqual(classifyStatusPoll(BASELINE, { status: 'loading', spec: SPEC, startedAt: null }, SPEC), { action: 'wait' });
});

test('a running spec means keep waiting', () => {
  assert.deepEqual(classifyStatusPoll(BASELINE, { ...passed, status: 'running' }, SPEC), { action: 'wait' });
});

// The trap the official skill calls "non-negotiable": `run` returns before the
// new run starts, and status keeps showing the PREVIOUS verdict until then.
test('a verdict carrying the baseline startedAt is the previous run and is not accepted', () => {
  assert.deepEqual(classifyStatusPoll(BASELINE, { ...passed, startedAt: BASELINE }, SPEC), { action: 'wait' });
});

test('a passed verdict with a changed startedAt is fresh', () => {
  assert.deepEqual(classifyStatusPoll(BASELINE, passed, SPEC), { action: 'verdict', verdict: 'passed', status: passed });
});

test('a failed verdict with a changed startedAt is fresh', () => {
  const failed: TapStatus = { ...passed, status: 'failed', results: { passed: 1, failed: 1, pending: 0, skipped: 0 } };
  assert.equal(classifyStatusPoll(BASELINE, failed, SPEC).action, 'verdict');
});

test('the very first run after "spec not selected" (null baseline) is fresh', () => {
  assert.equal(classifyStatusPoll(null, passed, SPEC).action, 'verdict');
});

test('a verdict for a different spec is the previous run', () => {
  assert.deepEqual(classifyStatusPoll(BASELINE, { ...passed, spec: 'cypress/e2e/catalog/catalog.feature' }, SPEC), { action: 'wait' });
});

test('a build failure on first selection (null startedAt with an error) is a failed verdict', () => {
  const built: TapStatus = { status: 'failed', spec: SPEC, startedAt: null, error: 'esbuild: Unexpected token' };
  assert.equal(classifyStatusPoll(null, built, SPEC).action, 'verdict');
});

test('a null startedAt without an error is not a verdict yet', () => {
  assert.deepEqual(classifyStatusPoll(null, { status: 'failed', spec: SPEC, startedAt: null }, SPEC), { action: 'wait' });
});

test('passed with zero passing tests means nothing ran and aborts', () => {
  const empty: TapStatus = { ...passed, results: { passed: 0, failed: 0, pending: 0, skipped: 2 } };
  assert.equal(classifyStatusPoll(BASELINE, empty, SPEC).action, 'abort');
});

test('losing the session mid-poll aborts', () => {
  assert.equal(classifyStatusPoll(BASELINE, { status: 'not connected' }, SPEC).action, 'abort');
});
