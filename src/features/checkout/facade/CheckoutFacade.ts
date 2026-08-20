import { CheckoutApiClient } from '../api/CheckoutApiClient';
import { CheckoutRequestBuilder } from '../data/CheckoutRequestBuilder';
import { LocatorProxy } from '../../../core/locators/LocatorProxy';
import { AUTH_TOKEN_STORAGE_KEY } from '../../../core/config/storageKeys';
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
  // ٤٨٫٧١ for the same pizza p01), so the tip amount computed downstream
  // must come from this response, not a recomputed guess.
  seedCartViaApi(accessToken: string, countryCode: CountryCode, items: CheckoutRequestData['items']): Cypress.Chainable<number> {
    return this.checkoutApi
      .setMarket(accessToken, countryCode)
      .then(() =>
        this.checkoutApi.seedCart(
          accessToken,
          items.map((item) => ({ pizza_id: item.pizzaId, quantity: item.quantity, size: item.size })),
        ),
      )
      .then((cartItems) => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  }

  // Used for API-only checkout arrangement (e.g. a future negative-path
  // test that never touches the UI form). Not called by this slice's
  // current happy-path scenarios, which submit via the real UI form
  // instead (see CheckoutFacade.fillAndSubmitCheckoutForm) - that's the
  // whole point of testing Checkout, proving the actual form works.
  checkoutViaApi(accessToken: string, data: CheckoutRequestData, subtotal: number): Cypress.Chainable<OrderSummary> {
    const body = CheckoutRequestBuilder.fromCheckoutData(data, subtotal);
    return this.checkoutApi.checkout(accessToken, body);
  }

  // Two-phase visit, matching every other slice's Facade: visiting '/'
  // first lets the app stamp its release-invalidation guard before the
  // token is written, so a second visit to /catalog doesn't lose it.
  openCatalogAuthenticated(accessToken: string, countryCode: CountryCode): void {
    cy.visit('/');
    cy.window().then((win) => {
      win.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
      win.localStorage.setItem('countryCode', countryCode);
    });
    cy.visit('/catalog');
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

  // order-id's rendered text carries a literal "#" prefix the API's own
  // order_id field does not have (confirmed live) - contain.text, not eq,
  // for exactly that reason.
  assertOrderSuccess(): void {
    cy.get(this.locators.get('orderSuccess.readyMarker')).should('be.visible');
    cy.get(this.locators.get('orderSuccess.orderId')).should('be.visible').and('contain.text', 'ORDER-');
  }
}
