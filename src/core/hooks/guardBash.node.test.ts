import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideBashGuard } from './guardBash';

test('a cy.prompt run is denied because it is billed per execution', () => {
  assert.equal(decideBashGuard('pnpm exec cypress run --spec cypress/e2e/checkout/checkout.feature --expose UI_STRATEGY=cyPrompt').allow, false);
});

test('recording to Cypress Cloud is denied', () => {
  assert.equal(decideBashGuard('pnpm exec cypress run --record --key abc').allow, false);
});

test('reading the record key into the environment is denied', () => {
  assert.equal(decideBashGuard('CYPRESS_RECORD_KEY=abc pnpm cy:run').allow, false);
});

test('dispatching the cy.prompt workflow is denied', () => {
  assert.equal(decideBashGuard('gh workflow run cy-prompt-suite.yml').allow, false);
});

test('git push is denied', () => {
  assert.equal(decideBashGuard('git push origin feat/c-agentic-loop').allow, false);
});

test('the reason names the rule that fired', () => {
  const decision = decideBashGuard('git push');
  assert.match(decision.allow ? 'ALLOWED' : decision.reason, /never push/i);
});

test('an ordinary tap run is allowed', () => {
  assert.deepEqual(decideBashGuard('pnpm tap:run cypress/e2e/auth/auth.feature'), { allow: true });
});
