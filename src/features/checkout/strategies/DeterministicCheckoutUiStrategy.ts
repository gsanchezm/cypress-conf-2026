import type { CheckoutUiStrategy } from './CheckoutUiStrategy';
import { CHECKOUT_COUNTRY_STRATEGIES } from './CheckoutCountryStrategy';
import { formatOrderTotal } from '../data/formatOrderTotal';
import { toCartItemBody } from '../data/toCartItemBody';
import { CheckoutApiClient } from '../api/CheckoutApiClient';
import { LocatorProxy } from '@/core/locators/LocatorProxy';
import { AUTH_TOKEN_STORAGE_KEY } from '@/core/config/storageKeys';
import type { CheckoutRequestData, OrderSummary } from '@/core/types';

// Seeds the cart via API instead of clicking catalog's "add to cart" -
// live-verified 2026-08-20 that a cy.request()-seeded cart (the same
// Node-side mechanism used below) renders correctly on /checkout after a
// real UI login. Catalog's add-to-cart button is already exercised by
// CatalogFacade's own suite, so re-driving it here would be redundant, not
// additional coverage - this strategy only needs to prove the checkout
// FORM itself works.
export class DeterministicCheckoutUiStrategy implements CheckoutUiStrategy {
  constructor(
    private readonly locators: LocatorProxy,
    private readonly checkoutApi: CheckoutApiClient,
  ) {}

  // The two-step confirm (place-order button opens a modal; confirm-order-yes
  // is the real submit) is a live-confirmed fact, not an assumption -
  // clicking placeOrderButton alone does not submit the order.
  completeCheckout(order: CheckoutRequestData): void {
    const strategy = CHECKOUT_COUNTRY_STRATEGIES[order.countryCode];

    cy.window().then((win) => {
      const token = win.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (!token) {
        throw new Error(
          'DeterministicCheckoutUiStrategy.completeCheckout: no auth token in localStorage - the UI login step must run first',
        );
      }
      return this.checkoutApi.seedCart(token, order.items.map(toCartItemBody));
    });

    cy.visit('/checkout');
    cy.get(this.locators.get('checkout.readyMarker')).should('be.visible');
    // Checkout's cart comes from a client-side store that rehydrates a
    // moment after the API-seeded cart above resolves, not from a fetch on
    // page load (live-confirmed: no /api/cart GET ever fires here) - the
    // form below doesn't render at all while the cart still reads empty, so
    // this field needs headroom beyond the default 4s command timeout.
    cy.get(this.locators.get(`checkout.${strategy.requiredFieldLocatorKey}`), { timeout: 10000 }).should(
      'be.visible',
    );
    cy.get(this.locators.get('checkout.address')).clear().type(order.address);
    cy.get(this.locators.get(`checkout.${strategy.requiredFieldLocatorKey}`)).clear().type(order.requiredFieldValue);
    cy.get(this.locators.get('checkout.fullName')).clear().type(order.name);
    cy.get(this.locators.get('checkout.phone')).clear().type(order.phone);
    cy.get(this.locators.get('checkout.paymentMethodCash')).click();
    cy.get(this.locators.get('checkout.placeOrderButton')).click();
    cy.get(this.locators.get('checkout.confirmOrderYes')).click();
  }

  // Exact-match on the rendered total, not just a generic "an order exists"
  // check - /order-success persists the last order across direct
  // navigation, so a stale order from a previous run could otherwise pass
  // this check without proving THIS market's order. order-id's rendered
  // text carries a literal "#" prefix the API's own order_id field does
  // not have (confirmed live) - contain.text, not eq, for exactly that
  // reason.
  assertOrderConfirmation(expected: OrderSummary): void {
    const expectedTotalText = formatOrderTotal(expected.currency, expected.currencySymbol, expected.total);
    cy.get(this.locators.get('orderSuccess.readyMarker')).should('be.visible');
    cy.get(this.locators.get('orderSuccess.orderId')).should('be.visible').and('contain.text', 'ORDER-');
    cy.get(this.locators.get('orderSuccess.orderTotal')).should('have.text', expectedTotalText);
  }
}
