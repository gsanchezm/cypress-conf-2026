// Shape of `cy-cloud test list` (Cypress Cloud CLI docs, "cy-cloud test list").
// Attempts are 1-indexed to match the Cloud dashboard; a passing attempt has
// null error fields. Kept as a plain mirror of the documented JSON so a saved
// document (or a piped `cy-cloud` call) can be audited without the Cloud.
export interface CloudAttempt {
  attemptNumber: number;
  errorName: string | null;
  errorMessage: string | null;
  stackTrace: string | null;
}

export type CloudTestStatus = 'passed' | 'failed' | 'pending' | 'skipped';

export interface CloudTest {
  projectId: string;
  runNumber: number;
  specFilepath: string;
  specName: string;
  testName: string[];
  testId: string;
  testReplayUrl: string;
  browserName: string;
  status: CloudTestStatus;
  attempts: CloudAttempt[];
}

export interface CloudTestList {
  tests: CloudTest[];
}
