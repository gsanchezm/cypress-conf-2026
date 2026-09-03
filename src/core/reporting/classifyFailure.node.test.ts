import { test } from 'node:test';
import assert from 'node:assert/strict';
import { causeOf, classifyFailure } from './classifyFailure';

const withError = (name: string, message: string) => ({ error: { name, message } });

test('a PreconditionError is an arrange-step failure', () => {
  assert.equal(classifyFailure(withError('PreconditionError', 'Precondition not met: the login issued a token')), 'precondition');
});

// cy.get() timeouts surface as AssertionError, so the attribute name has to
// win over the error name - otherwise every broken-locator demo would be
// filed as a product claim.
test('a timeout on the self-naming broken selector is a broken locator, even as an AssertionError', () => {
  assert.equal(
    classifyFailure(withError('AssertionError', 'Timed out retrying after 4000ms: Expected to find element: `[data-cy-broken-locator="checkout.address"]`, but never found it.')),
    'broken-locator',
  );
});

// Observed live on the integration branch (2026-09-02): MUTATE_DOM renames the
// real data-testid, cy.get() times out with this exact wording, and the row
// must read broken-locator (selector drift) rather than product-claim.
test('a cy.get timeout on a renamed data-testid is a broken locator, not a product claim', () => {
  const message = 'Timed out retrying after 4000ms: Expected to find element: `[data-testid="address-desktop"]`, but never found it.';
  assert.equal(classifyFailure(withError('AssertionError', message)), 'broken-locator');
});

test('an ApiError with a 5xx is infrastructure (Render cold start or backend crash)', () => {
  assert.equal(classifyFailure(withError('ApiError', 'POST /api/checkout failed with 503')), 'infra');
});

test('an ApiError with a 4xx is a broken precondition', () => {
  assert.equal(classifyFailure(withError('ApiError', 'POST /api/cart failed with 401')), 'precondition');
});

test('a CypressError carrying a network code is infrastructure', () => {
  assert.equal(classifyFailure(withError('CypressError', 'cy.request() failed trying to load: ... Error: read ECONNRESET')), 'infra');
});

test('any other AssertionError is a product claim', () => {
  assert.equal(classifyFailure(withError('AssertionError', "expected '¥2,051' to equal '¥2,050'")), 'product-claim');
});

test('an unrecognised error is unknown', () => {
  assert.equal(classifyFailure(withError('TypeError', 'x is not a function')), 'unknown');
});

test('a result without an error is unknown', () => {
  assert.equal(classifyFailure({}), 'unknown');
});

test('causeOf is undefined for a test that did not fail', () => {
  assert.equal(causeOf({ state: 'passed' }), undefined);
});
