import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_TIERS, FALLBACK_RESOLVERS, escapeSelectorValue, fallbackCandidates, isFallbackTier } from './fallbackTiers';

test('escapes the two characters that would break an attribute selector', () => {
  assert.equal(escapeSelectorValue('say "hi" \\ bye'), 'say \\"hi\\" \\\\ bye');
});

test('resolves an attribute tier to a quoted attribute selector', () => {
  assert.equal(FALLBACK_RESOLVERS.ariaLabel('Street address'), '[aria-label="Street address"]');
});

test('resolves inputType to an input tag with that type', () => {
  assert.equal(FALLBACK_RESOLVERS.inputType('tel'), 'input[type="tel"]');
});

// Innermost element containing the text: :contains alone would also match
// body and every ancestor, which is never "exactly one".
test('resolves text to the innermost element containing it', () => {
  assert.equal(FALLBACK_RESOLVERS.text('Place order'), ':contains("Place order"):not(:has(:contains("Place order")))');
});

test('keeps Arabic text verbatim so an RTL market heals through the same tier', () => {
  assert.equal(FALLBACK_RESOLVERS.placeholder('عنوان الشارع'), '[placeholder="عنوان الشارع"]');
});

test('orders candidates by tier first, harvested value second', () => {
  const candidates = fallbackCandidates({ placeholder: ['Street address', 'Dirección'], id: ['address'] });
  assert.deepEqual(
    candidates.map((candidate) => candidate.selector),
    ['[id="address"]', '[placeholder="Street address"]', '[placeholder="Dirección"]'],
  );
});

test('has a resolver for every tier, in the declared order', () => {
  assert.deepEqual(Object.keys(FALLBACK_RESOLVERS), [...FALLBACK_TIERS]);
});

test('rejects a tier name it does not know', () => {
  assert.equal(isFallbackTier('ariaLabell'), false);
});
