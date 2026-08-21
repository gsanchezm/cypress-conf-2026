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
//
// `expectedValue` exists because the guard found a real one on its first
// live run (2026-08-21): OmniPizza's checkout normalises the phone input,
// so typing "+15551234567" leaves "15551234567" in the DOM. Every other
// field in the suite - including Japan's CJK address and prefecture and
// Saudi Arabia's - keeps what was typed byte for byte, so the default of
// `value` is right everywhere else.
//
// Pass the app's rewritten value here rather than relaxing the check.
// Whatever normalisation is declared stays exact, so a field that starts
// rewriting input in some new way still fails loudly instead of being
// absorbed by a looser comparison.
export function fillField(selector: string, value: string, expectedValue: string = value): void {
  precondition(value.length > 0, `a non-empty value was supplied for the field at ${selector}`);
  cy.get(selector).clear().type(value).should('have.value', expectedValue);
}
