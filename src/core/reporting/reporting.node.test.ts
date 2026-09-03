import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReportingSubject } from './ReportingSubject';
import { GithubActionsSummaryObserver } from './GithubActionsSummaryObserver';
import type { TestResult } from './Observer';

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
