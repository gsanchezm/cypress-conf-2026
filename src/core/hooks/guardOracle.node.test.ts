import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideOracleGuard, toProjectRelative } from './guardOracle';

const PROJECT = 'C:/Users/gilsa/Documents/Repos/cypress-conf-2026/.worktrees/c-agentic-loop';
const options = { projectDir: PROJECT, allowTestEdits: false };
const reasonOf = (decision: ReturnType<typeof decideOracleGuard>): string => (decision.allow ? 'ALLOWED' : decision.reason);

test('a feature file is the oracle and cannot be edited', () => {
  const intent = { filePath: 'cypress/e2e/checkout/checkout.feature', before: 'Given', after: 'Given x' };
  assert.match(reasonOf(decideOracleGuard([intent], options)), /is the oracle/);
});

test('an absolute Windows path to a feature file is recognised', () => {
  const filePath = 'C:\\Users\\gilsa\\Documents\\Repos\\cypress-conf-2026\\.worktrees\\c-agentic-loop\\cypress\\e2e\\auth\\auth.feature';
  assert.equal(decideOracleGuard([{ filePath, before: '', after: '' }], options).allow, false);
});

test('a facade edit that touches a .should( call is a claim change and is denied', () => {
  const intent = { filePath: 'src/features/auth/facade/AuthFacade.ts', before: ".should('eq', '/catalog')", after: ".should('include', '/')" };
  assert.match(reasonOf(decideOracleGuard([intent], options)), /holds claims/);
});

test('a strategy edit that touches an assert* method is denied', () => {
  const intent = {
    filePath: 'src/features/checkout/strategies/DeterministicCheckoutUiStrategy.ts',
    before: 'assertOrderConfirmation(expected: OrderSummary): void {',
    after: 'assertOrderConfirmation(): void {',
  };
  assert.equal(decideOracleGuard([intent], options).allow, false);
});

test('a facade edit that touches only a non-claim method is allowed', () => {
  const intent = { filePath: 'src/features/auth/facade/AuthFacade.ts', before: "cy.visit('/catalog');", after: "cy.visit('/catalog/');" };
  assert.equal(decideOracleGuard([intent], options).allow, true);
});

test('expect( in a step definition is outside the claim homes and is allowed', () => {
  const intent = { filePath: 'src/features/auth/steps/auth.steps.ts', before: 'a', after: 'expect(1).to.equal(1)' };
  assert.equal(decideOracleGuard([intent], options).allow, true);
});

// fillField's .should('have.value') is a guard, not a claim - see
// src/core/testing/precondition.ts for where that line is drawn.
test('a .should( in src/core is a guard and is allowed', () => {
  const intent = { filePath: 'src/core/ui/fillField.ts', before: ".should('have.value', expectedValue)", after: ".should('have.value', value)" };
  assert.equal(decideOracleGuard([intent], options).allow, true);
});

test('writing a whole new facade that contains expect( is denied', () => {
  const intent = { filePath: 'src/features/orders/facade/OrdersFacade.ts', before: '', after: 'export class OrdersFacade { assertX() { expect(1).to.equal(1); } }' };
  assert.equal(decideOracleGuard([intent], options).allow, false);
});

test('authoring a cy.prompt( call in a step file is denied because it is billed per execution', () => {
  const intent = { filePath: 'src/features/auth/steps/auth.steps.ts', before: '', after: "cy.prompt(['log in as {user}'])" };
  assert.match(reasonOf(decideOracleGuard([intent], options)), /billed per execution/);
});

test('the cyPrompt strategy itself may keep calling cy.prompt(', () => {
  const intent = {
    filePath: 'src/features/checkout/strategies/CyPromptCheckoutUiStrategy.ts',
    before: 'cy.prompt(prompt.steps)',
    after: 'cy.prompt(prompt.steps, { placeholders: prompt.placeholders })',
  };
  assert.equal(decideOracleGuard([intent], options).allow, true);
});

test('removing a stray cy.prompt( call is allowed (only authoring one is guarded)', () => {
  const intent = { filePath: 'src/features/auth/steps/auth.steps.ts', before: "cy.prompt(['x'])", after: 'authFacade.login()' };
  assert.equal(decideOracleGuard([intent], options).allow, true);
});

test('ALLOW_TEST_EDITS lets a human change the contract', () => {
  const intent = { filePath: 'cypress/e2e/auth/auth.feature', before: '', after: '' };
  assert.equal(decideOracleGuard([intent], { ...options, allowTestEdits: true }).allow, true);
});

test('toProjectRelative strips the project dir and normalises to POSIX', () => {
  assert.equal(toProjectRelative(`${PROJECT.replace(/\//g, '\\')}\\src\\a.ts`, PROJECT), 'src/a.ts');
});
