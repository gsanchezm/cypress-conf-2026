import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseCandidate } from './chooseCandidate';
import type { SelectorCandidate } from './SelectorSource';

const candidates: SelectorCandidate[] = [
  { tier: 'registry', selector: '[data-testid="address-desktop"]' },
  { tier: 'id', selector: '[id="address"]' },
  { tier: 'placeholder', selector: '[placeholder="Street address"]' },
];

const countsOf = (counts: Record<string, number>) => (selector: string) => counts[selector] ?? 0;

test('picks the primary when it matches exactly one element', () => {
  const choice = chooseCandidate(candidates, countsOf({ '[data-testid="address-desktop"]': 1, '[id="address"]': 1 }));
  assert.deepEqual(choice, { candidate: candidates[0], index: 0 });
});

test('falls through to the next tier when the primary matches nothing', () => {
  const choice = chooseCandidate(candidates, countsOf({ '[id="address"]': 1 }));
  assert.equal(choice?.candidate.tier, 'id');
});

// An ambiguous heal is worse than none: typing into the wrong input would pass
// fillField's own value guard and surface three commands later as a mystery.
test('skips a tier that matches more than one element', () => {
  const choice = chooseCandidate(candidates, countsOf({ '[id="address"]': 2, '[placeholder="Street address"]': 1 }));
  assert.equal(choice?.candidate.tier, 'placeholder');
});

test('returns undefined when no tier matches exactly one element', () => {
  assert.equal(chooseCandidate(candidates, countsOf({ '[id="address"]': 3 })), undefined);
});

test('stops counting at the first unique tier', () => {
  const counted: string[] = [];
  chooseCandidate(candidates, (selector) => {
    counted.push(selector);
    return 1;
  });
  assert.deepEqual(counted, ['[data-testid="address-desktop"]']);
});
