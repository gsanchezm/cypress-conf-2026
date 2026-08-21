import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CheckoutRequestBuilder } from './CheckoutRequestBuilder';
import type { CheckoutRequestData } from '@/core/types';

const baseData: CheckoutRequestData = {
  countryCode: 'US',
  items: [{ pizzaId: 'p01', quantity: 1, size: 'small' }],
  name: 'Test Harvester',
  address: '742 Evergreen Terrace',
  phone: '+15551234567',
  paymentMethod: 'cash',
  requiredFieldValue: '90210',
  tipPercentage: 0,
};

test('US: uses zip_code and tip as the required-field/tip body keys', () => {
  const body = CheckoutRequestBuilder.fromCheckoutData(baseData, 12.99);
  assert.equal(body.zip_code, '90210');
  assert.equal(body.tip, 0);
  assert.equal(body.country_code, 'US');
  assert.deepEqual(body.items, [{ pizza_id: 'p01', quantity: 1, size: 'small' }]);
});

test('MX: uses colonia and propina as the required-field/tip body keys', () => {
  const body = CheckoutRequestBuilder.fromCheckoutData(
    { ...baseData, countryCode: 'MX', requiredFieldValue: 'Polanco' },
    227.97,
  );
  assert.equal(body.colonia, 'Polanco');
  assert.equal('propina' in body, true);
  assert.equal('zip_code' in body, false);
});

test('CH/JP: the required-field API key differs from the shared zip-code DOM field', () => {
  const chBody = CheckoutRequestBuilder.fromCheckoutData(
    { ...baseData, countryCode: 'CH', requiredFieldValue: '8001' },
    10.16,
  );
  assert.equal(chBody.plz, '8001');
  assert.equal('trinkgeld' in chBody, true);

  const jpBody = CheckoutRequestBuilder.fromCheckoutData(
    { ...baseData, countryCode: 'JP', requiredFieldValue: '東京都' },
    2051,
  );
  assert.equal(jpBody.prefectura, '東京都');
  assert.equal('chip' in jpBody, true);
});

test('computes the tip amount from the subtotal and percentage, not a flat value', () => {
  const body = CheckoutRequestBuilder.fromCheckoutData({ ...baseData, tipPercentage: 15 }, 12.99);
  assert.equal(body.tip, 1.95); // 12.99 * 0.15, rounded to 2 decimals
});
