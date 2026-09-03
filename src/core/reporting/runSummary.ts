import type { RunMetadata } from './RunObserver';

type AfterRunResults = CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult | undefined;

// The after:spec handler in cypress.config.ts joins Cypress's title array with this. Anything that
// keys by TestResult.title (attemptsByTitle, screenshot matching) has to agree with it.
export const TITLE_SEPARATOR = ' > ';

export function joinTitle(title: string[]): string {
  return title.join(TITLE_SEPARATOR);
}

// after:run receives undefined under `cypress open` and a CypressFailedRunResult (no `runs`) when
// Cypress could not start the run at all - neither has anything to report.
export function isCompletedRun(results: AfterRunResults): results is CypressCommandLine.CypressRunResult {
  return results !== undefined && 'runs' in results;
}

function stringLabels(expose: Record<string, unknown>): Record<string, string> {
  const entries = Object.entries(expose).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return Object.fromEntries(entries);
}

export function toRunMetadata(results: CypressCommandLine.CypressRunResult, expose: Record<string, unknown>): RunMetadata {
  const tests = results.runs.flatMap((run) => run.tests);
  return {
    startedAt: results.startedTestsAt,
    finishedAt: results.endedTestsAt,
    browser: `${results.browserName} ${results.browserVersion}`,
    cypressVersion: results.cypressVersion,
    labels: stringLabels(expose),
    screenshots: results.runs.flatMap((run) => run.screenshots.map((screenshot) => screenshot.path)),
    attemptsByTitle: Object.fromEntries(tests.map((test) => [joinTitle(test.title), test.attempts.length])),
  };
}
