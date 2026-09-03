import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReportingSubject } from './ReportingSubject';
import { GithubActionsSummaryObserver } from './GithubActionsSummaryObserver';
import type { TestResult } from './Observer';
import type { RunMetadata, RunSummary } from './RunObserver';

const sampleResult: TestResult = {
  specPath: 'cypress/e2e/auth/auth.feature',
  title: 'A standard customer logs in successfully',
  state: 'passed',
  durationMs: 842,
  slice: 'auth',
};

function summaryFileWith(results: TestResult[][]): string {
  const summaryFile = join(mkdtempSync(join(tmpdir(), 'gha-summary-')), 'summary.md');
  const observer = new GithubActionsSummaryObserver(summaryFile);
  results.forEach((batch) => observer.onSpecComplete(batch));
  return readFileSync(summaryFile, 'utf8');
}

test('ReportingSubject notifies every subscribed observer', () => {
  const received: TestResult[][] = [];
  const subject = new ReportingSubject();
  subject.subscribe({ onSpecComplete: (results) => received.push(results) });
  subject.subscribe({ onSpecComplete: (results) => received.push(results) });

  subject.notify([sampleResult]);

  assert.equal(received.length, 2);
});

test('ReportingSubject hands every observer the same results', () => {
  const received: TestResult[][] = [];
  const subject = new ReportingSubject();
  subject.subscribe({ onSpecComplete: (results) => received.push(results) });
  subject.subscribe({ onSpecComplete: (results) => received.push(results) });

  subject.notify([sampleResult]);

  assert.deepEqual(received, [[sampleResult], [sampleResult]]);
});

test('GithubActionsSummaryObserver appends a markdown row with strategy, attempts and cause', () => {
  const content = summaryFileWith([[sampleResult]]);
  assert.match(content, /\| auth \| deterministic \| A standard customer logs in successfully \| passed \| 1 \| 842ms \| – \|/);
});

test('GithubActionsSummaryObserver accumulates the by-strategy table across specs', () => {
  const content = summaryFileWith([[sampleResult], [{ ...sampleResult, slice: 'catalog' }]]);
  assert.match(content, /\| deterministic \| 2 \| 2 \| 0 \| 0\.8 s \|\n$/);
});

test('GithubActionsSummaryObserver is a no-op when no summary path is configured', () => {
  const observer = new GithubActionsSummaryObserver(undefined);
  assert.doesNotThrow(() => observer.onSpecComplete([sampleResult]));
});

const sampleMetadata: RunMetadata = {
  startedAt: '2026-09-02T10:00:00.000Z',
  finishedAt: '2026-09-02T10:01:30.000Z',
  browser: 'chrome 140.0.0.0',
  cypressVersion: '15.21.0',
  labels: {},
  screenshots: [],
  attemptsByTitle: {},
};

test('ReportingSubject hands every collected spec result to a run observer on run completion', async () => {
  const received: RunSummary[] = [];
  const subject = new ReportingSubject();
  subject.subscribeRun({ onRunComplete: (summary) => { received.push(summary); } });
  subject.notify([sampleResult]);
  subject.notify([{ ...sampleResult, title: 'A locked-out customer cannot log in' }]);

  await subject.notifyRunComplete(sampleMetadata);

  assert.deepEqual(received[0].results.map((result) => result.title), [
    'A standard customer logs in successfully',
    'A locked-out customer cannot log in',
  ]);
});

test('ReportingSubject spreads the run metadata into the summary it publishes', async () => {
  const received: RunSummary[] = [];
  const subject = new ReportingSubject();
  subject.subscribeRun({ onRunComplete: (summary) => { received.push(summary); } });

  await subject.notifyRunComplete(sampleMetadata);

  assert.equal(received[0].browser, 'chrome 140.0.0.0');
});
