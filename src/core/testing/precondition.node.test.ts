import { test } from 'node:test';
import assert from 'node:assert/strict';
import { precondition, PreconditionError } from './precondition';

test('passes silently when the condition holds', () => {
  assert.doesNotThrow(() => precondition(true, 'the sky is blue'));
});

test('throws PreconditionError, not an assertion failure, when the condition does not hold', () => {
  assert.throws(
    () => precondition(false, 'the catalog response carries at least one pizza'),
    (err) => {
      assert.ok(err instanceof PreconditionError);
      assert.match(err.message, /Precondition not met: the catalog response carries at least one pizza/);
      return true;
    },
  );
});

test('narrows a nullable value to non-null for the caller', () => {
  const token: string | null = 'abc' as string | null;
  precondition(token !== null, 'a token was issued');
  // Compile-time proof of the narrowing: this line does not typecheck
  // without the `asserts` signature, because token is string | null above.
  assert.equal(token.length, 3);
});
