import type { TestResult } from '../Observer';
import type { RunSummary } from '../RunObserver';
import type { TestRailConfig } from './TestRailConfig';
import { caseIdFor, type CaseMap } from './caseMap';
import { toStatusId } from './statusMap';

// An API method with its path arguments ('add_run/7') plus the JSON body. The client adds the
// base URL, auth and Content-Type; keeping these pure makes the exact payloads unit-testable.
export interface TestRailRequest {
  readonly method: string;
  readonly body: unknown;
}

export interface MappedResult {
  test: TestResult;
  caseId: number;
  statusId: number;
}

function attemptsOf(summary: RunSummary, test: TestResult): number {
  return summary.attemptsByTitle[test.title] ?? 1;
}

export function mapResults(summary: RunSummary, caseMap: CaseMap): MappedResult[] {
  return summary.results.flatMap((test) => {
    const caseId = caseIdFor(caseMap, test);
    const statusId = toStatusId(test.state, attemptsOf(summary, test));
    if (caseId === undefined || statusId === undefined) return [];
    return [{ test, caseId, statusId }];
  });
}

// TestRail's timespan format ("5m", "15s"); "0s" is rejected, so sub-second tests round up.
export function elapsedOf(durationMs: number): string {
  return `${Math.max(1, Math.round(durationMs / 1000))}s`;
}

function labelPairs(labels: Record<string, string>): string[] {
  return Object.entries(labels).map(([key, value]) => `${key}=${value}`);
}

export function runName(summary: RunSummary): string {
  const slices = [...new Set(summary.results.map((result) => result.slice))].sort().join('+') || 'no-specs';
  const pairs = labelPairs(summary.labels);
  const labels = pairs.length === 0 ? '' : ` [${pairs.join(', ')}]`;
  return `cypress-conf-2026 ${slices} ${summary.startedAt} (${summary.browser})${labels}`;
}

export function runDescription(summary: RunSummary): string {
  const count = (state: TestResult['state']): number => summary.results.filter((result) => result.state === state).length;
  return [
    `Cypress ${summary.cypressVersion} on ${summary.browser}`,
    `passed: ${count('passed')}, failed: ${count('failed')}, pending: ${count('pending')}, skipped: ${count('skipped')}`,
    `started ${summary.startedAt}, finished ${summary.finishedAt}`,
    ...labelPairs(summary.labels),
  ].join('\n');
}

export function addRunRequest(config: Pick<TestRailConfig, 'projectId' | 'suiteId'>, summary: RunSummary, caseIds: number[]): TestRailRequest {
  const distinct = [...new Set(caseIds)].sort((a, b) => a - b);
  return {
    method: `add_run/${config.projectId}`,
    body: {
      ...(config.suiteId === undefined ? {} : { suite_id: config.suiteId }),
      name: runName(summary),
      description: runDescription(summary),
      include_all: false,
      case_ids: distinct,
    },
  };
}

function commentOf(mapped: MappedResult, summary: RunSummary): string {
  const attempts = attemptsOf(summary, mapped.test);
  const retried = attempts > 1 ? ` (attempts: ${attempts})` : '';
  return `${mapped.test.state} in ${mapped.test.durationMs} ms on ${summary.browser} - Cypress ${summary.cypressVersion}${retried}`;
}

export function addResultsRequest(runId: number, mapped: MappedResult[], summary: RunSummary): TestRailRequest {
  return {
    method: `add_results_for_cases/${runId}`,
    body: {
      results: mapped.map((entry) => ({
        case_id: entry.caseId,
        status_id: entry.statusId,
        comment: commentOf(entry, summary),
        elapsed: elapsedOf(entry.test.durationMs),
      })),
    },
  };
}

export function closeRunRequest(runId: number): TestRailRequest {
  return { method: `close_run/${runId}`, body: {} };
}
