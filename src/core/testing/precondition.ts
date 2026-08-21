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
// prove. Preconditions throw; only claims use expect()/should(). Keeping
// them in different mechanisms is what makes "how many things does this
// scenario assert?" answerable by counting expect()/should() calls - if
// preconditions were written as expect() too, the count would be noise.
//
// The `asserts` signature also narrows the caller's type, so a guarded
// `string | null` is a `string` afterwards without a second check.
export function precondition(condition: boolean, description: string): asserts condition {
  if (!condition) {
    throw new PreconditionError(description);
  }
}
