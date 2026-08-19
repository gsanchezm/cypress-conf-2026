import { BaseApiClient } from '../../../core/http/BaseApiClient';
import type { CountryConfig, PizzaCatalogItem, PizzaCatalogResponse, CountryCode } from '../../../core/types';

interface CountryInfoBody {
  code: CountryCode;
  currency: string;
  currency_symbol: string;
  required_fields: string[];
  optional_fields: string[];
  tip_field: string;
  tip_percentages: number[];
  tax_rate: number;
  delivery_fee: number;
  languages: string[];
  decimal_places: number;
}

interface PizzaBody {
  id: string;
  name: string;
  description: string;
  price: number;
  base_price: number;
  currency: string;
  currency_symbol: string;
  image: string;
  category: string;
}

interface PizzaResponseBody {
  pizzas: PizzaBody[];
  country_code: string;
  currency: string;
}

function toCountryConfig(body: CountryInfoBody): CountryConfig {
  return {
    code: body.code,
    currency: body.currency,
    currencySymbol: body.currency_symbol,
    requiredFields: body.required_fields,
    optionalFields: body.optional_fields,
    tipField: body.tip_field,
    tipPercentages: body.tip_percentages,
    taxRate: body.tax_rate,
    deliveryFee: body.delivery_fee,
    languages: body.languages,
    decimalPlaces: body.decimal_places,
  };
}

function toPizza(body: PizzaBody): PizzaCatalogItem {
  return {
    id: body.id,
    name: body.name,
    description: body.description,
    price: body.price,
    basePrice: body.base_price,
    currency: body.currency,
    currencySymbol: body.currency_symbol,
    image: body.image,
    category: body.category,
  };
}

export class CatalogApiClient extends BaseApiClient {
  protected readonly basePath = '/api';

  // No auth required - the one unauthenticated endpoint this slice uses.
  getCountries(): Cypress.Chainable<CountryConfig[]> {
    return this.request<CountryInfoBody[]>({ method: 'GET', path: '/countries' }).then((body) =>
      body.map(toCountryConfig),
    );
  }

  // Requires auth + X-Country-Code (400 if missing, confirmed against the live API).
  getPizzas(accessToken: string, countryCode: CountryCode): Cypress.Chainable<PizzaCatalogResponse> {
    return this.request<PizzaResponseBody>({
      method: 'GET',
      path: '/pizzas',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Country-Code': countryCode,
      },
    }).then((body) => ({
      countryCode: body.country_code,
      currency: body.currency,
      pizzas: body.pizzas.map(toPizza),
    }));
  }

  setMarket(accessToken: string, countryCode: CountryCode): Cypress.Chainable<void> {
    // Same known TS/Cypress generic-inference gap documented on
    // BaseApiClient.request: Chainable<unknown>.then(() => undefined)
    // doesn't narrow to Chainable<void> on its own, so bridge it with an
    // explicit cast - the runtime value is already void-shaped.
    return this.request({
      method: 'POST',
      path: '/store/market',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { country_code: countryCode },
    }).then(() => undefined) as Cypress.Chainable<void>;
  }
}
