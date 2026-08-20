import { CHECKOUT_COUNTRY_STRATEGIES } from '../strategies/CheckoutCountryStrategy';
import type { CheckoutRequestData, CartItemRequest } from '../../../core/types';

function toCartItemBody(item: CartItemRequest): Record<string, unknown> {
  const body: Record<string, unknown> = { pizza_id: item.pizzaId, quantity: item.quantity };
  if (item.size !== undefined) body.size = item.size;
  if (item.toppings !== undefined) body.toppings = item.toppings;
  return body;
}

// Builder, not a plain function: checkout payloads carry one required-field
// key and one tip key that both vary by country (CheckoutCountryStrategy),
// plus several always-present fields - reads better as a fluent
// construction than a function with many optional positional args.
export class CheckoutRequestBuilder {
  static fromCheckoutData(data: CheckoutRequestData, subtotal: number): Record<string, unknown> {
    const strategy = CHECKOUT_COUNTRY_STRATEGIES[data.countryCode];
    const tipAmount = Number(((subtotal * data.tipPercentage) / 100).toFixed(2));

    return {
      country_code: data.countryCode,
      items: data.items.map(toCartItemBody),
      name: data.name,
      address: data.address,
      phone: data.phone,
      payment_method: data.paymentMethod,
      [strategy.requiredFieldApiKey]: data.requiredFieldValue,
      [strategy.tipApiKey]: tipAmount,
    };
  }
}
