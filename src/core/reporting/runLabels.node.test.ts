import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeLabels, readRunLabels, strategyOf } from './runLabels';

test('defaults the strategy to deterministic when nothing is exposed', () => {
  assert.deepEqual(readRunLabels(undefined), { UI_STRATEGY: 'deterministic' });
});

test('picks only the run-label keys out of config.expose', () => {
  const labels = readRunLabels({ apiUrl: 'https://x', UI_STRATEGY: 'cyPrompt', BREAK_LOCATOR: 'checkout.address' });
  assert.deepEqual(labels, { UI_STRATEGY: 'cyPrompt', BREAK_LOCATOR: 'checkout.address' });
});

test('drops an empty label instead of keeping a blank string', () => {
  assert.deepEqual(readRunLabels({ BREAK_LOCATOR: '   ' }), { UI_STRATEGY: 'deterministic' });
});

test('strategyOf reads the label and falls back to deterministic', () => {
  assert.equal(strategyOf({ labels: undefined }), 'deterministic');
});

test('describeLabels lists the strategy first and the other labels as key=value', () => {
  assert.equal(
    describeLabels({ UI_STRATEGY: 'cyPrompt', HEAL_LOCATORS: 'on', BREAK_LOCATOR: 'checkout.address' }),
    'cyPrompt, BREAK_LOCATOR=checkout.address, HEAL_LOCATORS=on',
  );
});
