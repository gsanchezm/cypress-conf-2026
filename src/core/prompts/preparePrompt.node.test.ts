import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { preparePrompt, parsePromptDocument } from './preparePrompt';

// The .md files themselves are loaded by esbuild's text loader, which only
// exists inside the Cypress bundle - tsx has no such loader. So every test
// here feeds the parser a string literal, which is also why the parser
// takes a string rather than a file path.
const DOC = `
# Checkout prompts

Prose between sections is documentation for whoever edits this file and is
never handed to cy.prompt().

## completeCheckout

- Add the pizza with id {pizzaId} to the cart
- Enter {address} into the address field
- Click the place order button

## assertOrderConfirmation

Some rationale for the assertion below.

- Verify the order total shown is exactly {expectedTotalText}
`;

test('parses each heading into a section of ordered steps', () => {
  const doc = parsePromptDocument(DOC);
  assert.deepEqual(Object.keys(doc), ['completeCheckout', 'assertOrderConfirmation']);
  assert.deepEqual(doc.completeCheckout, [
    'Add the pizza with id {pizzaId} to the cart',
    'Enter {address} into the address field',
    'Click the place order button',
  ]);
});

test('drops prose, keeping only list items as steps', () => {
  const doc = parsePromptDocument(DOC);
  assert.deepEqual(doc.assertOrderConfirmation, ['Verify the order total shown is exactly {expectedTotalText}']);
});

test('rejects a document that declares the same section twice', () => {
  assert.throws(
    () => parsePromptDocument('## dup\n\n- a\n\n## dup\n\n- b\n'),
    /declared more than once: dup/,
  );
});

test('returns the steps and placeholders for a named section', () => {
  const prompt = preparePrompt(DOC, 'assertOrderConfirmation', { expectedTotalText: '$12.99' });
  assert.deepEqual(prompt.steps, ['Verify the order total shown is exactly {expectedTotalText}']);
  assert.deepEqual(prompt.placeholders, { expectedTotalText: '$12.99' });
});

test('throws for a section the document does not declare', () => {
  assert.throws(
    () => preparePrompt(DOC, 'completeRefund', {}),
    /no section "completeRefund".*completeCheckout, assertOrderConfirmation/s,
  );
});

// The whole reason the validation exists: once the prompt text lives in a
// .md anyone can edit, a renamed placeholder no longer breaks the build -
// cy.prompt would just receive the literal "{addres}" and the AI would
// improvise. These two tests are the guard against that.
test('throws when a step references a placeholder that was not supplied', () => {
  assert.throws(
    () => preparePrompt(DOC, 'completeCheckout', { pizzaId: 'p01' }),
    /never supplied: address/,
  );
});

test('throws when a supplied placeholder is referenced by no step', () => {
  assert.throws(
    () => preparePrompt(DOC, 'assertOrderConfirmation', { expectedTotalText: '$1', phone: '555' }),
    /no step ever references: phone/,
  );
});

test('accepts a placeholder referenced by more than one step', () => {
  const prompt = preparePrompt('## s\n\n- one {x}\n- two {x}\n', 's', { x: 'v' });
  assert.deepEqual(prompt.steps, ['one {x}', 'two {x}']);
});

test('rejects a section with no steps rather than sending cy.prompt an empty list', () => {
  assert.throws(() => preparePrompt('## empty\n\nonly prose here\n', 'empty', {}), /declares no steps/);
});

// The real document, read from disk rather than imported: tsx has no .md
// loader, but node:fs does not need one. This is what catches a typo'd
// heading or a renamed placeholder in the shipped file offline, at
// `pnpm test:unit:node` time - the alternative is finding out during a
// billed Cypress Cloud run, which is the one place cy.prompt can execute.
test('the shipped checkout prompt document declares the sections and placeholders the strategy supplies', () => {
  const markdown = readFileSync(
    new URL('../../features/checkout/prompts/checkout.prompt.md', import.meta.url),
    'utf8',
  );

  const complete = preparePrompt(markdown, 'completeCheckout', {
    pizzaId: 'p01',
    address: 'somewhere',
    requiredFieldValue: 'something',
    name: 'someone',
    phone: '+15551234567',
  });
  assert.equal(complete.steps.length, 10);

  const confirm = preparePrompt(markdown, 'assertOrderConfirmation', { expectedTotalText: '$12.99' });
  assert.equal(confirm.steps.length, 2);
});
