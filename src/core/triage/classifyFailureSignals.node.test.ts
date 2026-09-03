import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyFailureSignals, suggestCategory } from './classifyFailureSignals';

const categoriesOf = (text: string) => classifyFailureSignals(text).map((signal) => signal.category);

// What `cypress run` prints for the README's BREAK_LOCATOR demo: one
// CypressError line carries the broken locator, the other three carry nothing.
test('a broken-locator demo failure is selector drift', () => {
  const log = readFileSync(new URL('./fixtures/checkout-broken-locator.log', import.meta.url), 'utf8');
  assert.deepEqual(categoriesOf(log), ['selector_drift']);
});

test('a PreconditionError is an environment problem, not a product failure', () => {
  assert.deepEqual(
    categoriesOf('PreconditionError: Precondition not met: the standard customer login issued an access token'),
    ['env'],
  );
});

test('a socket reset against the backend reads as a cold start', () => {
  assert.deepEqual(
    categoriesOf('CypressError: cy.request() failed trying to load: https://omnipizza-backend.onrender.com/api/auth/login ... ECONNRESET'),
    ['cold_start'],
  );
});

test('a retry that passed reads as flake', () => {
  assert.deepEqual(categoriesOf('✓ A standard customer logs in successfully (2 retries)'), ['flake']);
});

test('an AssertionError with nothing else is a regression', () => {
  assert.deepEqual(categoriesOf("AssertionError: expected '￥2,051' to equal '￥2,052'"), ['regression']);
});

test('the evidence is the matching line, trimmed', () => {
  assert.equal(
    classifyFailureSignals('   AssertionError: expected 1 to equal 2   ')[0]?.evidence,
    'AssertionError: expected 1 to equal 2',
  );
});

// A broken selector explains every assertion that follows it, so it wins.
test('selector drift outranks a downstream assertion error', () => {
  const text = 'Expected to find element: [data-testid="x"], but never found it.\nAssertionError: expected 1 to equal 2';
  assert.equal(suggestCategory(classifyFailureSignals(text)), 'selector_drift');
});

test('no signals means no suggestion', () => {
  assert.equal(suggestCategory(classifyFailureSignals('all green')), null);
});
