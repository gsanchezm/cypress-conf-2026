import type { TestResult } from '../Observer';
import type { RunSummary } from '../RunObserver';
import type { TestRailConfig } from './TestRailConfig';
import { caseIdFor, scenarioTitleOf, stripExampleSuffix, type CaseMap } from './caseMap';
import { TESTRAIL_STATUS, toStatusId } from './statusMap';

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

export interface GroupedResult {
  caseId: number;
  entries: MappedResult[];
}

function attemptsOf(summary: RunSummary, test: TestResult): number {
  return summary.attemptsByTitle[test.title] ?? 1;
}

export function mapResults(summary: RunSummary, caseMap: CaseMap): MappedResult[] {
  return summary.results.flatMap((test) => {
    const caseId = caseIdFor(caseMap, test);
    const statusId = toStatusId(test.state, attemptsOf(summary, test));
    // Cypress reports tag-filtered examples as pending. They were not executed,
    // so they must not make a single-market run look blocked in TestRail.
    if (caseId === undefined || statusId === undefined) return [];
    return [{ test, caseId, statusId }];
  });
}

export function groupResults(mapped: MappedResult[]): GroupedResult[] {
  const groups = new Map<number, MappedResult[]>();
  for (const entry of mapped) {
    const entries = groups.get(entry.caseId) ?? [];
    entries.push(entry);
    groups.set(entry.caseId, entries);
  }
  return [...groups].map(([caseId, entries]) => ({ caseId, entries }));
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
  const scenario = stripExampleSuffix(scenarioTitleOf(mapped.test.title));
  const error = mapped.test.error?.message ? `: ${mapped.test.error.message.slice(0, 500)}` : '';
  return `${scenario}: ${mapped.test.state} in ${mapped.test.durationMs} ms on ${summary.browser} - Cypress ${summary.cypressVersion}${retried}${error}`;
}

function groupStatus(entries: MappedResult[]): number {
  if (entries.some((entry) => entry.statusId === TESTRAIL_STATUS.failed)) return TESTRAIL_STATUS.failed;
  if (entries.some((entry) => entry.statusId === TESTRAIL_STATUS.blocked)) return TESTRAIL_STATUS.blocked;
  if (entries.some((entry) => entry.statusId === TESTRAIL_STATUS.retest)) return TESTRAIL_STATUS.retest;
  return TESTRAIL_STATUS.passed;
}

export function addResultsRequest(runId: number, mapped: MappedResult[], summary: RunSummary): TestRailRequest {
  return {
    method: `add_results_for_cases/${runId}`,
    body: {
      results: groupResults(mapped).map((group) => ({
        case_id: group.caseId,
        status_id: groupStatus(group.entries),
        comment: group.entries.map((entry) => commentOf(entry, summary)).join('\n'),
        elapsed: elapsedOf(group.entries.reduce((total, entry) => total + entry.test.durationMs, 0)),
        custom_testrail_bdd_scenario_results: group.entries.map((entry) => ({
          content: stripExampleSuffix(scenarioTitleOf(entry.test.title)),
          status_id: entry.statusId,
        })),
      })),
    },
  };
}

export function closeRunRequest(runId: number): TestRailRequest {
  return { method: `close_run/${runId}`, body: {} };
}
