import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harvestAttributes, mergeHarvest, type HarvestableElement } from './harvestFallbacks';

function element(tagName: string, attributes: Record<string, string>, textContent: string | null = null): HarvestableElement {
  return { tagName, textContent, getAttribute: (name) => attributes[name] ?? null };
}

test('records every attribute tier the element carries and nothing else', () => {
  const input = element('INPUT', { id: 'address', placeholder: 'Street address', type: 'text', 'aria-label': 'Street address' });
  assert.deepEqual(harvestAttributes(input), { id: 'address', ariaLabel: 'Street address', placeholder: 'Street address', inputType: 'text' });
});

test('defaults an untyped input to text', () => {
  assert.equal(harvestAttributes(element('input', { name: 'q' })).inputType, 'text');
});

test('records trimmed visible text for a non-input element', () => {
  assert.equal(harvestAttributes(element('BUTTON', {}, '  Place order \n')).text, 'Place order');
});

test('does not record text for an input, whose textContent is never its label', () => {
  assert.equal(harvestAttributes(element('INPUT', {}, 'ignored')).text, undefined);
});

test('does not record text longer than 60 characters', () => {
  assert.equal(harvestAttributes(element('DIV', {}, 'x'.repeat(61))).text, undefined);
});

test('keeps RTL marks and Arabic text verbatim', () => {
  assert.equal(harvestAttributes(element('SPAN', {}, '\u200F٦٣٫٥٢ ر.س.\u200F')).text, '\u200F٦٣٫٥٢ ر.س.\u200F');
});

test('merges a second market into the same key without duplicating values', () => {
  const first = mergeHarvest({}, 'checkout.address', { id: 'address', placeholder: 'Street address' });
  const second = mergeHarvest(first, 'checkout.address', { id: 'address', placeholder: 'Dirección' });
  assert.deepEqual(second, { 'checkout.address': { id: ['address'], placeholder: ['Street address', 'Dirección'] } });
});

test('leaves other keys untouched when merging', () => {
  const map = mergeHarvest({ 'checkout.phone': { inputType: ['tel'] } }, 'checkout.address', { id: 'address' });
  assert.deepEqual(map['checkout.phone'], { inputType: ['tel'] });
});
