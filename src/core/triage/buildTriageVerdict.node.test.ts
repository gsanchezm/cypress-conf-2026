import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTriageVerdict } from './buildTriageVerdict';

test('unknown logs yield a valid review-only verdict', () => {
  assert.deepEqual(buildTriageVerdict('job failed without Cypress output'), {
    category: null,
    confidence: 0,
    evidence: [],
    summary: 'No known failure signal found; inspect the failed run.',
  });
});

test('one matching line cannot trigger the automatic rerun gate', () => {
  const verdict = buildTriageVerdict('ECONNRESET');
  assert.equal(verdict.category, 'cold_start');
  assert.equal(verdict.confidence, 0.5);
});

test('two distinct lines allow a high-confidence infrastructure verdict', () => {
  const verdict = buildTriageVerdict('ECONNRESET\nETIMEDOUT\nECONNRESET');
  assert.equal(verdict.category, 'cold_start');
  assert.equal(verdict.confidence, 0.7);
  assert.deepEqual(verdict.evidence, ['ECONNRESET', 'ETIMEDOUT']);
});
