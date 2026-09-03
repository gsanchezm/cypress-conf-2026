import type { TestResult } from './Observer';
import { causeOf } from './classifyFailure';

export const ICONS: Record<TestResult['state'], string> = {
  passed: '✅',
  failed: '❌',
  pending: '⏸️',
  skipped: '⏭️',
};

const MAX_ERROR_CHARS = 200;

function truncate(text: string): string {
  return text.length <= MAX_ERROR_CHARS ? text : `${text.slice(0, MAX_ERROR_CHARS - 1)}…`;
}

// The one-line console rendering. Failures say how many attempts it took
// and why it failed, so a scrolled terminal or a CI log answers the triage
// question without opening a screenshot.
export function describeResult(result: TestResult): string {
  const head = `${ICONS[result.state]} [${result.slice}] ${result.title} (${result.durationMs}ms)`;
  const cause = causeOf(result);
  if (cause === undefined) return head;
  const error = result.error ? ` · ${result.error.name}: ${truncate(result.error.message)}` : '';
  return `${head} · attempts ${result.attempts ?? 1} · cause ${cause}${error}`;
}
