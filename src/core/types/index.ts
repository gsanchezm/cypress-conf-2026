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

export interface PizzaCatalogResponse {
  countryCode: string;
  currency: string;
  pizzas: PizzaCatalogItem[];
}

export interface CartItemRequest {
  pizzaId: string;
  quantity: number;
  size?: string;
  toppings?: string[];
}

export type PaymentMethod = 'card' | 'cash' | 'paypal';

export interface CheckoutRequestData {
  countryCode: CountryCode;
  items: CartItemRequest[];
  name: string;
  address: string;
  phone: string;
  paymentMethod: PaymentMethod;
  requiredFieldValue: string;
  tipPercentage: number;
}

export interface OrderSummary {
  orderId: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  taxRate: number;
  tipPercentage: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
  currencySymbol: string;
  timestamp: string;
}
