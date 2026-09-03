import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatOutcome, isAwake, pollUntilAwake, type PollOptions, type Probe } from './pollUntilAwake';

// A probe that answers from a queue: numbers are HTTP statuses, Errors are
// network failures. sleep and now are stubbed so the tests run instantly.
function probeFrom(answers: Array<number | Error>): Probe {
  const queue = [...answers];
  return async () => {
    const next = queue.shift() ?? 200;
    if (next instanceof Error) throw next;
    return next;
  };
}

function instant(probe: Probe, maxAttempts = 3): PollOptions {
  return { probe, sleep: async () => undefined, now: () => 0, maxAttempts, intervalMs: 0 };
}

test('any response below 500 means the service is awake', () => {
  assert.equal(isAwake(404), true);
});

test('a 200 on the first probe is awake after one attempt', async () => {
  assert.deepEqual(await pollUntilAwake('https://x', instant(probeFrom([200]))), {
    url: 'https://x',
    awake: true,
    status: 200,
    attempts: 1,
    elapsedMs: 0,
  });
});

test('a cold 503 is retried until the service answers', async () => {
  assert.equal((await pollUntilAwake('https://x', instant(probeFrom([503, 503, 200])))).attempts, 3);
});

test('a network error counts as a failed attempt, never as awake', async () => {
  assert.equal((await pollUntilAwake('https://x', instant(probeFrom([new Error('ECONNRESET'), 200])))).attempts, 2);
});

test('gives up after maxAttempts and reports the last status', async () => {
  assert.deepEqual(await pollUntilAwake('https://x', instant(probeFrom([502, 502, 502]), 3)), {
    url: 'https://x',
    awake: false,
    status: 502,
    attempts: 3,
    elapsedMs: 0,
  });
});

test('formats one aligned line per target', () => {
  assert.equal(
    formatOutcome('backend', { url: 'https://x', awake: false, status: 503, attempts: 12, elapsedMs: 118402 }),
    'backend   DOWN  503  attempt 12  118402 ms',
  );
});
