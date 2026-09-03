import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachmentForm, attachmentMethod, screenshotsForTitle } from './attachments';

// Real names Cypress produced for this repo (cypress/screenshots/checkout.feature/...).
const screenshots = [
  'C:/proj/cypress/screenshots/checkout.feature/Checkout -- A standard customer completes an order in Japan (example #4) (failed).png',
  'C:/proj/cypress/screenshots/checkout.feature/Checkout -- A standard customer completes an order in Japan (example #4) (failed) (attempt 2).png',
  'C:/proj/cypress/screenshots/checkout.feature/Checkout -- A standard customer completes an order in Mexico (example #2) (failed).png',
];

test('screenshotsForTitle matches every attempt of the failed test by the " -- " joined title prefix', () => {
  const matched = screenshotsForTitle('Checkout > A standard customer completes an order in Japan (example #4)', screenshots);
  assert.equal(matched.length, 2);
});

test('attachmentForm puts the file in the "attachment" field TestRail expects', () => {
  const form = attachmentForm('C:/proj/shot.png', new Uint8Array([137, 80, 78, 71]));
  const file = form.get('attachment');
  assert.equal(file instanceof File && file.name, 'shot.png');
});

test('attachmentMethod targets the created result id', () => {
  assert.equal(attachmentMethod(99), 'add_attachment_to_result/99');
});
