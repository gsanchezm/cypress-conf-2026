import { test } from 'node:test';
import assert from 'node:assert/strict';
import { belongsToScreen, renamedTestId } from './mutation';

// Reads like a real refactor in the app, and names itself so the failure
// screenshot cannot be mistaken for a genuine regression.
test('renames a testid to a self-identifying successor', () => {
  assert.equal(renamedTestId('address-desktop'), 'address-desktop--renamed-by-demo');
});

test('a key belongs to the screen that prefixes it', () => {
  assert.equal(belongsToScreen('checkout.address', 'checkout'), true);
});

test('a key does not belong to a screen whose name merely starts the same way', () => {
  assert.equal(belongsToScreen('checkoutExtra.address', 'checkout'), false);
});
