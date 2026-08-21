import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrokenSelectorSource, brokenSelectorFor } from './BrokenSelectorSource';
import { LocatorProxy } from './LocatorProxy';

const tree = {
  checkout: {
    address: '[data-testid="address-desktop"]',
    fullName: '[data-testid="full-name-desktop"]',
  },
};

test('resolves every key except the broken one exactly as the real source does', () => {
  const source = new BrokenSelectorSource(new LocatorProxy(tree), 'checkout.address');
  assert.equal(source.get('checkout.fullName'), '[data-testid="full-name-desktop"]');
});

test('returns a self-identifying selector for the broken key', () => {
  const source = new BrokenSelectorSource(new LocatorProxy(tree), 'checkout.address');
  assert.equal(source.get('checkout.address'), brokenSelectorFor('checkout.address'));
  assert.match(source.get('checkout.address'), /checkout\.address/);
});

// So the demo's failure can never be mistaken for a real one: the selector
// names itself in Cypress's "expected to find element" message.
test('the broken selector cannot collide with a real app selector', () => {
  assert.match(brokenSelectorFor('checkout.address'), /^\[data-cy-broken-locator=/);
});

// A typo'd key would otherwise break nothing at all and the demo would
// quietly pass, which is the worst possible outcome for a live demo.
test('rejects a key the real source does not know, at construction time', () => {
  assert.throws(
    () => new BrokenSelectorSource(new LocatorProxy(tree), 'checkout.adress'),
    /no selector registered for key "checkout.adress"/,
  );
});
