import { precondition } from '@/core/testing/precondition';

// Extracted from the 2025 framework's `typeIfNotEmpty` action, with the two
// halves of that name treated differently.
//
// KEPT - the verification. 2025 re-typed through cypress-recurse until the
// input's value actually equalled the text, because a controlled React
// input can silently drop characters when a re-render lands mid-type. The
// bare `.clear().type()` this replaces would leave that as a mystery
// failure three commands later, at the assertion. `.should('have.value')`
// catches it at the source and, unlike a `.then()` check, retries - so a
// value the app sets one tick late still passes.
//
// DROPPED - the "IfNotEmpty" no-op. 2025 skipped empty text because
// SauceDemo's checkout form had optional fields. Every field this framework
// fills is required, so an empty value here means the scenario's test data
// is broken; silently skipping would turn that into a confusing form-
// validation failure further down. It throws instead.
//
// The `.should()` below is a guard, not a claim: it verifies the arrange
// step did what it was told, and asserts nothing about product behaviour.
// See precondition.ts for where that line is drawn.
export function fillField(selector: string, value: string): void {
  precondition(value.length > 0, `a non-empty value was supplied for the field at ${selector}`);
  cy.get(selector).clear().type(value).should('have.value', value);
}
