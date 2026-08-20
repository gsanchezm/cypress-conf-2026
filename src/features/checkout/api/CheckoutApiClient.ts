import { BaseApiClient } from '../../../core/http/BaseApiClient';
import type { CartItemBody } from '../data/toCartItemBody';
import type { CountryCode, OrderSummary } from '../../../core/types';

interface EnrichedCartItemBody {
  price: number;
  quantity: number;
}

interface CartResponseBody {
  cart_items: EnrichedCartItemBody[];
}

interface OrderSummaryBody {
  order_id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  tax_rate: number;
  tip_percentage: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
  currency_symbol: string;
  timestamp: string;
}

function toOrderSummary(body: OrderSummaryBody): OrderSummary {
  return {
    orderId: body.order_id,
    status: body.status,
    subtotal: body.subtotal,
    deliveryFee: body.delivery_fee,
    taxRate: body.tax_rate,
    tipPercentage: body.tip_percentage,
    tax: body.tax,
    tip: body.tip,
    total: body.total,
    currency: body.currency,
    currencySymbol: body.currency_symbol,
    timestamp: body.timestamp,
  };
}

export class CheckoutApiClient extends BaseApiClient {
  protected readonly basePath = '/api';

  // Confirmed live: replaces the entire cart (not additive), scoped to the
  // session not the market. Returns void deliberately - this response
  // carries no price data (confirmed: only pizza_id/quantity/size/
  // toppings/item_id, no price); callers needing the priced cart must call
  // getCart() afterward. Untyped request (matches setMarket's pattern)
  // since the response is discarded - naming it as a generic here would
  // hit the same TS/Cypress Chainable<T>.then(() => undefined) inference
  // gap BaseApiClient.request documents, since T wouldn't be unknown.
  seedCart(accessToken: string, items: CartItemBody[]): Cypress.Chainable<void> {
    return this.request({
      method: 'POST',
      path: '/cart',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { items },
    }).then(() => undefined) as Cypress.Chainable<void>;
  }

  // Requires X-Country-Code (400 without it, confirmed live) - the enriched,
  // priced cart is market-dependent (same pizza prices differently per
  // market), so the header isn't optional the way it might look from
  // POST /api/cart's leaner response alone.
  getCart(accessToken: string, countryCode: CountryCode): Cypress.Chainable<EnrichedCartItemBody[]> {
    return this.request<CartResponseBody>({
      method: 'GET',
      path: '/cart',
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Country-Code': countryCode },
    }).then((body) => body.cart_items);
  }

  // Duplicated from CatalogApiClient rather than shared: each slice stays
  // independently readable/deletable (vertical slicing), and this is only
  // the second occurrence - rule-of-three not yet met.
  setMarket(accessToken: string, countryCode: CountryCode): Cypress.Chainable<void> {
    return this.request({
      method: 'POST',
      path: '/store/market',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { country_code: countryCode },
    }).then(() => undefined) as Cypress.Chainable<void>;
  }

  checkout(accessToken: string, body: Record<string, unknown>): Cypress.Chainable<OrderSummary> {
    return this.request<OrderSummaryBody>({
      method: 'POST',
      path: '/checkout',
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }).then(toOrderSummary);
  }
}
