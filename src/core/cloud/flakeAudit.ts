// Offline flake audit over a `cy-cloud test list` document. Pure: the caller
// (scripts/flake-audit.ts, cy-triage) supplies the JSON text; nothing here
// talks to Cypress Cloud.
import type { CloudTest, CloudTestList } from './cloudTypes';

export interface FlakyTest {
  testId: string;
  testName: string;
  specFilepath: string;
  attempts: number;
  firstError: string | null;
  testReplayUrl: string;
}

export interface FlakeReport {
  totalTests: number;
  flakyCount: number;
  flaky: FlakyTest[];
}

function isTestList(value: unknown): value is CloudTestList {
  if (typeof value !== 'object' || value === null) return false;
  return Array.isArray((value as { tests?: unknown }).tests);
}

export function parseCloudTestList(json: string): CloudTestList {
  const parsed: unknown = JSON.parse(json);
  if (!isTestList(parsed)) {
    throw new Error('Flake audit: expected a cy-cloud "test list" document with a "tests" array');
  }
  return parsed;
}

// The Cloud docs' own definition ("Workflow: debug a flaky test"): there is
// no `--status flaky` filter; a test is flaky when it passed overall and
// needed more than one attempt to do so. Works on any plan with retries.
const isFlaky = (test: CloudTest): boolean => test.status === 'passed' && test.attempts.length > 1;

function toFlakyTest(test: CloudTest): FlakyTest {
  return {
    testId: test.testId,
    testName: test.testName.join(' > '),
    specFilepath: test.specFilepath,
    attempts: test.attempts.length,
    firstError: test.attempts[0]?.errorMessage ?? null,
    testReplayUrl: test.testReplayUrl,
  };
}

export function findFlakyTests(list: CloudTestList): FlakyTest[] {
  return list.tests.filter(isFlaky).map(toFlakyTest);
}

export function summariseFlakes(list: CloudTestList): FlakeReport {
  const flaky = findFlakyTests(list);
  return { totalTests: list.tests.length, flakyCount: flaky.length, flaky };
}
