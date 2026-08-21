import type { CountryCode } from '@/core/types';

export interface CheckoutCountryStrategy {
  readonly countryCode: CountryCode;
  /** Locator key (under LocatorProxy's "checkout" branch) for the DOM field to type the required value into. */
  readonly requiredFieldLocatorKey: 'requiredFieldZipCode' | 'requiredFieldColonia' | 'requiredFieldDistrict';
  /** JSON body key POST /api/checkout expects for the required field's value. */
  readonly requiredFieldApiKey: string;
  /** JSON body key POST /api/checkout expects for the tip amount. */
  readonly tipApiKey: string;
}

// Live-harvested 2026-08-19: the DOM testid and the API body key diverge
// for CH and JP (both reuse the generic "zip-code" DOM field despite
// different API keys), which is exactly why this is a Strategy per country
// rather than a single string-transform lookup.
export const CHECKOUT_COUNTRY_STRATEGIES: Record<CountryCode, CheckoutCountryStrategy> = {
  US: { countryCode: 'US', requiredFieldLocatorKey: 'requiredFieldZipCode', requiredFieldApiKey: 'zip_code', tipApiKey: 'tip' },
  MX: { countryCode: 'MX', requiredFieldLocatorKey: 'requiredFieldColonia', requiredFieldApiKey: 'colonia', tipApiKey: 'propina' },
  CH: { countryCode: 'CH', requiredFieldLocatorKey: 'requiredFieldZipCode', requiredFieldApiKey: 'plz', tipApiKey: 'trinkgeld' },
  JP: { countryCode: 'JP', requiredFieldLocatorKey: 'requiredFieldZipCode', requiredFieldApiKey: 'prefectura', tipApiKey: 'chip' },
  SA: { countryCode: 'SA', requiredFieldLocatorKey: 'requiredFieldDistrict', requiredFieldApiKey: 'district', tipApiKey: 'baksheesh' },
};
