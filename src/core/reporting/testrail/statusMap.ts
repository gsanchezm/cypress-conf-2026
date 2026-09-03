import type { TestResult } from '../Observer';

// TestRail's built-in status ids. 3 (Untested) exists but the API rejects submitting it, which is
// exactly right: a pending/skipped scenario was not tested.
export const TESTRAIL_STATUS = { passed: 1, blocked: 2, retest: 4, failed: 5 } as const;

export function toStatusId(state: TestResult['state'], attempts = 1): number | undefined {
  if (state === 'failed') return TESTRAIL_STATUS.failed;
  if (state !== 'passed') return undefined;
  return attempts > 1 ? TESTRAIL_STATUS.retest : TESTRAIL_STATUS.passed;
}
