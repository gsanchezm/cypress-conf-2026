import { CheckoutApiClient } from '../api/CheckoutApiClient';
import { CheckoutRequestBuilder } from '../data/CheckoutRequestBuilder';
import { LocatorProxy } from '../../../core/locators/LocatorProxy';
import type { CheckoutRequestData, OrderSummary, CountryCode } from '../../../core/types';

export class CheckoutFacade {
  constructor(
    private readonly checkoutApi: CheckoutApiClient,
    private readonly locators: LocatorProxy,
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
      .then(() =>
        this.checkoutApi.seedCart(
          accessToken,
          items.map((item) => ({ pizza_id: item.pizzaId, quantity: item.quantity, size: item.size })),
        ),
      )
      .then(() => this.checkoutApi.getCart(accessToken, countryCode))
      .then((cartItems) => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  }

  // Called from arrangeViaApi to prove the checkout API contract itself
  // (status, returned totals) - mirrors auth.steps.ts's locked-out
  // scenario, which also exercises the same action twice: once via a
  // direct API call to assert the contract, once via the real UI to prove
  // the actual user-facing flow (see hydrateUi's fillAndSubmitCheckoutForm
  // call in checkout.steps.ts). This creates its own separate order from
  // the one hydrateUi places via the UI - both are real, both are asserted.
  checkoutViaApi(accessToken: string, data: CheckoutRequestData, subtotal: number): Cypress.Chainable<OrderSummary> {
    const body = CheckoutRequestBuilder.fromCheckoutData(data, subtotal);
    return this.checkoutApi.checkout(accessToken, body);
  }

  addPizzaToCartViaUi(pizzaId: string): void {
    const addToCartSelector = this.locators.get('catalog.addToCart').replace('{pizzaId}', pizzaId);
    cy.get(addToCartSelector).click();
    cy.get(this.locators.get('catalog.confirmAddToCart')).click();
  }

  // The two-step confirm (place-order button opens a modal; confirm-order-yes
  // is the real submit) is a live-confirmed fact, not an assumption -
  // clicking placeOrderButton alone does not submit the order.
  fillAndSubmitCheckoutForm(
    data: CheckoutRequestData,
    requiredFieldLocatorKey: 'requiredFieldZipCode' | 'requiredFieldColonia' | 'requiredFieldDistrict',
  ): void {
    cy.visit('/checkout');
    cy.get(this.locators.get('checkout.readyMarker')).should('be.visible');
    cy.get(this.locators.get('checkout.address')).clear().type(data.address);
    cy.get(this.locators.get(`checkout.${requiredFieldLocatorKey}`)).clear().type(data.requiredFieldValue);
    cy.get(this.locators.get('checkout.fullName')).clear().type(data.name);
    cy.get(this.locators.get('checkout.phone')).clear().type(data.phone);
    cy.get(this.locators.get('checkout.paymentMethodCash')).click();
    cy.get(this.locators.get('checkout.placeOrderButton')).click();
    cy.get(this.locators.get('checkout.confirmOrderYes')).click();
  }

  // Exact-match on the rendered total, not just a generic "an order exists"
  // check - matches the Catalog slice's own precedent (format-only checks
  // can't distinguish markets, and /order-success persists the last order
  // across direct navigation, so a stale order from a previous run could
  // otherwise pass this check without proving THIS market's order.
  // order-id's rendered text carries a literal "#" prefix the API's own
  // order_id field does not have (confirmed live) - contain.text, not eq,
  // for exactly that reason.
  assertOrderSuccess(expectedTotalText: string): void {
    cy.get(this.locators.get('orderSuccess.readyMarker')).should('be.visible');
    cy.get(this.locators.get('orderSuccess.orderId')).should('be.visible').and('contain.text', 'ORDER-');
    cy.get(this.locators.get('orderSuccess.orderTotal')).should('have.text', expectedTotalText);
  }
}
