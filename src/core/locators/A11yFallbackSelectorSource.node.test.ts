import { test } from 'node:test';
import assert from 'node:assert/strict';
import { A11yFallbackSelectorSource } from './A11yFallbackSelectorSource';
import { BrokenSelectorSource, brokenSelectorFor } from './BrokenSelectorSource';
import { LocatorProxy } from './LocatorProxy';
import { chooseCandidate } from './chooseCandidate';
import type { FallbackMap } from './fallbackTiers';

const tree = {
  checkout: {
    address: '[data-testid="address-desktop"]',
    fullName: '[data-testid="full-name-desktop"]',
  },
};

const fallbacks: FallbackMap = {
  'checkout.address': { id: ['address'], placeholder: ['Street address', 'عنوان الشارع'] },
};

test('keeps the registry selector as the primary, first candidate', () => {
  const source = new A11yFallbackSelectorSource(new LocatorProxy(tree), fallbacks);
  assert.deepEqual(source.candidates('checkout.address')[0], { tier: 'registry', selector: '[data-testid="address-desktop"]' });
});

test('appends the fallback tiers after the primary, in tier order', () => {
  const source = new A11yFallbackSelectorSource(new LocatorProxy(tree), fallbacks);
  assert.deepEqual(
    source.candidates('checkout.address').map((candidate) => candidate.tier),
    ['registry', 'id', 'placeholder', 'placeholder'],
  );
});

test('offers only the inner candidates for a key the map does not cover', () => {
  const source = new A11yFallbackSelectorSource(new LocatorProxy(tree), fallbacks);
  assert.deepEqual(source.candidates('checkout.fullName'), [{ tier: 'registry', selector: '[data-testid="full-name-desktop"]' }]);
});

test('never changes what the primary selector is', () => {
  const source = new A11yFallbackSelectorSource(new LocatorProxy(tree), fallbacks);
  assert.equal(source.get('checkout.address'), '[data-testid="address-desktop"]');
});

// A map entry for a key no slice registers is a stale harvest, and a heal
// that could never fire is the quiet-wrong-behaviour this framework removes
// everywhere else.
test('rejects a fallback key the inner source does not know, at construction time', () => {
  assert.throws(
    () => new A11yFallbackSelectorSource(new LocatorProxy(tree), { 'checkout.adress': { id: ['address'] } }),
    /no selector registered for key "checkout.adress"/,
  );
});

// Cast through unknown: a fresh literal with a misspelt tier is a compile
// error (which is good), but the runtime check exists for the JSON import,
// whose keys TypeScript cannot vet.
test('rejects a tier name it does not know, at construction time', () => {
  const typoed = { 'checkout.address': { ariaLabell: ['x'] } } as unknown as FallbackMap;
  assert.throws(
    () => new A11yFallbackSelectorSource(new LocatorProxy(tree), typoed),
    /unknown tier\(s\) ariaLabell under "checkout.address"/,
  );
});

// The demo's fourth row: BREAK_LOCATOR + HEAL_LOCATORS. The broken selector
// is still tried first (it matches nothing by construction) and the
// fallbacks follow it.
test('composes with BrokenSelectorSource: broken selector first, fallbacks after', () => {
  const source = new A11yFallbackSelectorSource(new BrokenSelectorSource(new LocatorProxy(tree), 'checkout.address'), fallbacks);
  assert.deepEqual(
    source.candidates('checkout.address').map((candidate) => candidate.selector),
    [brokenSelectorFor('checkout.address'), '[id="address"]', '[placeholder="Street address"]', '[placeholder="عنوان الشارع"]'],
  );
});

test('a broken key heals through the first fallback tier that is unique in the DOM', () => {
  const source = new A11yFallbackSelectorSource(new BrokenSelectorSource(new LocatorProxy(tree), 'checkout.address'), fallbacks);
  const choice = chooseCandidate(source.candidates('checkout.address'), (selector) => (selector === '[id="address"]' ? 1 : 0));
  assert.equal(choice?.candidate.tier, 'id');
});
