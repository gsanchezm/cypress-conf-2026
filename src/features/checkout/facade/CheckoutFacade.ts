import { CheckoutApiClient } from '../api/CheckoutApiClient';
import { CheckoutRequestBuilder } from '../data/CheckoutRequestBuilder';
import { toCartItemBody } from '../data/toCartItemBody';
import type { CheckoutUiStrategy } from '../strategies/CheckoutUiStrategy';
import type { CheckoutRequestData, OrderSummary, CountryCode } from '../../../core/types';

export class CheckoutFacade {
  constructor(
    private readonly checkoutApi: CheckoutApiClient,
    private readonly uiStrategy: CheckoutUiStrategy,
  ) {}

  // Seeds the cart via the real API (not the UI) so the atomic flow's
  // arrangeViaApi step has a real, asserted-on subtotal to build the
  // checkout body from - per-market price is NOT a hardcoded constant
  // (confirmed: US $12.99, MX $227.97, CH CHF 10.16, JP ¥2,051, SA
  // ٤٨٫٧١ for the same pizza p01). POST /api/cart's own response carries
  // no price (confirmed live) - a separate GET /api/cart call (which
  // requires X-Country-Code) is what returns the enriched, priced items,
  // hence the two chained calls below rather than one.
  seedCartViaApi(accessToken: string, countryCode: CountryCode, items: CheckoutRequestData['items']): Cypress.Chainable<number> {
    return this.checkoutApi
      .setMarket(accessToken, countryCode)
      .then(() => this.checkoutApi.seedCart(accessToken, items.map(toCartItemBody)))
      .then(() => this.checkoutApi.getCart(accessToken, countryCode))
      .then((cartItems) => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  }

  // Called from arrangeViaApi to prove the checkout API contract itself
  // (status, returned totals) - mirrors auth.steps.ts's locked-out
  // scenario, which also exercises the same action twice: once via a
  // direct API call to assert the contract, once via the real UI to prove
  // the actual user-facing flow (see hydrateUi's completeCheckoutViaUi
  // call in checkout.steps.ts). This creates its own separate order from
  // the one hydrateUi places via the UI - both are real, both are asserted.
  checkoutViaApi(accessToken: string, data: CheckoutRequestData, subtotal: number): Cypress.Chainable<OrderSummary> {
    const body = CheckoutRequestBuilder.fromCheckoutData(data, subtotal);
    return this.checkoutApi.checkout(accessToken, body);
  }

  // Delegates to whichever CheckoutUiStrategy the composition root
  // injected (deterministic LocatorProxy clicks, or cy.prompt) - the step
  // definition that calls this never knows which.
  completeCheckoutViaUi(order: CheckoutRequestData): void {
    this.uiStrategy.completeCheckout(order);
  }

  assertOrderConfirmation(expected: OrderSummary): void {
    this.uiStrategy.assertOrderConfirmation(expected);
  }
}
