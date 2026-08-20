import { CHECKOUT_COUNTRY_STRATEGIES } from '../strategies/CheckoutCountryStrategy';
import { toCartItemBody } from './toCartItemBody';
import type { CheckoutRequestData } from '../../../core/types';

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
