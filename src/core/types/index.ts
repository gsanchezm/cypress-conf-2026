export interface AuthSession {
  accessToken: string;
  tokenType: 'bearer';
  username: string;
  behavior: string;
}

export type CountryCode = 'MX' | 'US' | 'CH' | 'JP' | 'SA';

export interface CountryConfig {
  code: CountryCode;
  currency: string;
  currencySymbol: string;
  requiredFields: string[];
  optionalFields: string[];
  tipField: string;
  tipPercentages: number[];
  taxRate: number;
  deliveryFee: number;
  languages: string[];
  decimalPlaces: number;
}

export interface PizzaCatalogItem {
  id: string;
  name: string;
  description: string;
  price: number;
  basePrice: number;
  currency: string;
  currencySymbol: string;
  image: string;
  category: string;
}
