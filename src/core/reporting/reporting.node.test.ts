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

test('ReportingSubject notifies every subscribed observer with the same results', () => {
  const received: TestResult[][] = [];
  const subject = new ReportingSubject();
  subject.subscribe({ onSpecComplete: (results) => received.push(results) });
  subject.subscribe({ onSpecComplete: (results) => received.push(results) });

  subject.notify([sampleResult]);

  assert.equal(received.length, 2);
  assert.deepEqual(received[0], [sampleResult]);
  assert.deepEqual(received[1], [sampleResult]);
});

test('GithubActionsSummaryObserver appends a markdown table row to the summary file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gha-summary-'));
  const summaryFile = join(dir, 'summary.md');
  const observer = new GithubActionsSummaryObserver(summaryFile);

  observer.onSpecComplete([sampleResult]);

  const content = readFileSync(summaryFile, 'utf8');
  assert.match(content, /\| auth \| A standard customer logs in successfully \| passed \| 842ms \|/);
});

test('GithubActionsSummaryObserver is a no-op when no summary path is configured', () => {
  const observer = new GithubActionsSummaryObserver(undefined);
  assert.doesNotThrow(() => observer.onSpecComplete([sampleResult]));
});
