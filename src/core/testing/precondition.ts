export class PreconditionError extends Error {
  constructor(message: string) {
    super(`Precondition not met: ${message}`);
    this.name = 'PreconditionError';
  }
}

// Draws the line this framework's assertion budget depends on: a
// PRECONDITION is something that must hold for a scenario's claim to mean
// anything (a token was issued, the response is for the market we asked
// for), whereas a CLAIM is the product behaviour the scenario exists to
// prove.
//
// Preconditions over plain JavaScript values throw, so they never appear in
// the assertion count. DOM-level guards still use .should() - that is how
// Cypress retries, and a .then() check would fail on anything the app
// renders a tick late - so counting .should() calls alone does not give the
// claim count. What does: every claim lives in an `assert*` method on a
// facade or strategy, and nothing outside one makes a claim. A .should()
// found anywhere else - fillField's value check, a ready-marker wait - is a
// guard by construction.
//
// The `asserts` signature also narrows the caller's type, so a guarded
// `string | null` is a `string` afterwards without a second check.
export function precondition(condition: boolean, description: string): asserts condition {
  if (!condition) {
    throw new PreconditionError(description);
  }
}
