import type { TestResult } from './Observer';

export const FAILURE_CAUSES = ['precondition', 'product-claim', 'broken-locator', 'infra', 'unknown'] as const;
export type FailureCause = (typeof FAILURE_CAUSES)[number];

const BROKEN_LOCATOR_MARK = 'data-cy-broken-locator';
// A cy.get() that never finds its element is selector drift (the app moved,
// the registry did not - the MUTATE_DOM demo, or a real UI change), not a
// product claim: claims live in assert* methods and read as .should() on an
// element that WAS found.
const ELEMENT_NOT_FOUND = /Expected to find element:/;
const SERVER_ERROR_STATUS = /failed with 5\d\d\b/;
const NETWORK_FAILURE =
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ESOCKETTIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|cy\.request\(\) failed|cy\.visit\(\) failed|failed trying to load|Timed out waiting for the page|responseTimeout/i;

// Ordered guard clauses; the order is the design. See spec §4.4 for why
// the broken-locator check precedes the AssertionError check.
export function classifyFailure(result: Pick<TestResult, 'error'>): FailureCause {
  const error = result.error;
  if (!error) return 'unknown';
  if (error.name === 'PreconditionError') return 'precondition';
  if (error.message.includes(BROKEN_LOCATOR_MARK)) return 'broken-locator';
  if (error.name === 'AssertionError' && ELEMENT_NOT_FOUND.test(error.message)) return 'broken-locator';
  if (error.name === 'ApiError') return SERVER_ERROR_STATUS.test(error.message) ? 'infra' : 'precondition';
  if (error.name === 'CypressError' && NETWORK_FAILURE.test(error.message)) return 'infra';
  if (error.name === 'AssertionError') return 'product-claim';
  return 'unknown';
}

export function causeOf(result: Pick<TestResult, 'state' | 'error'>): FailureCause | undefined {
  return result.state === 'failed' ? classifyFailure(result) : undefined;
}
