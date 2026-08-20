import { BaseApiClient } from '../../../core/http/BaseApiClient';
import type { CountryCode, OrderSummary } from '../../../core/types';

interface CartItemBody {
  pizza_id: string;
  quantity: number;
  size?: string;
}

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
  // session not the market. Returns the enriched cart so the caller can
  // compute the real per-market subtotal (price varies by market/currency -
  // there is no single hardcoded per-pizza price that works across all 5).
  seedCart(accessToken: string, items: CartItemBody[]): Cypress.Chainable<EnrichedCartItemBody[]> {
    return this.request<CartResponseBody>({
      method: 'POST',
      path: '/cart',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { items },
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
