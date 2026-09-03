import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leafKeys } from './leafKeys';

test('flattens a nested tree into dot paths', () => {
  assert.deepEqual(leafKeys({ checkout: { address: '[a]', phone: '[b]' }, orderSuccess: { orderId: '[c]' } }), [
    'checkout.address',
    'checkout.phone',
    'orderSuccess.orderId',
  ]);
});

// A template is not a selector until a facade interpolates it, so neither
// the harvest nor the healer can resolve it.
test('skips templated selectors', () => {
  assert.deepEqual(leafKeys({ login: { marketButton: '[data-testid="market-{countryCode}"]', submit: '[s]' } }), ['login.submit']);
});
