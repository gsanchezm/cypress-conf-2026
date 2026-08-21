import type { CheckoutUiStrategy } from './CheckoutUiStrategy';
import { CHECKOUT_COUNTRY_STRATEGIES } from './CheckoutCountryStrategy';
import { formatOrderTotal } from '../data/formatOrderTotal';
import { toCartItemBody } from '../data/toCartItemBody';
import { CheckoutApiClient } from '../api/CheckoutApiClient';
import type { SelectorSource } from '@/core/locators/SelectorSource';
import { AUTH_TOKEN_STORAGE_KEY } from '@/core/config/storageKeys';
import { precondition } from '@/core/testing/precondition';
import { fillField } from '@/core/ui/fillField';
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
    private readonly locators: SelectorSource,
    private readonly checkoutApi: CheckoutApiClient,
  ) {}

  // The two-step confirm (place-order button opens a modal; confirm-order-yes
  // is the real submit) is a live-confirmed fact, not an assumption -
  // clicking placeOrderButton alone does not submit the order.
  completeCheckout(order: CheckoutRequestData): void {
    const strategy = CHECKOUT_COUNTRY_STRATEGIES[order.countryCode];

    cy.window().then((win) => {
      const token = win.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      precondition(
        token !== null,
        'the UI login step ran before completeCheckout, leaving an auth token in localStorage',
      );
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
    fillField(this.locators.get('checkout.address'), order.address);
    fillField(this.locators.get(`checkout.${strategy.requiredFieldLocatorKey}`), order.requiredFieldValue);
    fillField(this.locators.get('checkout.fullName'), order.name);
    // The phone input strips the leading "+" - live-observed 2026-08-21,
    // when fillField's value guard caught it on its first run: typing
    // "+15551234567" leaves "15551234567" in the DOM. Narrowed to exactly
    // that, not a general "digits only" rule, because stripping "+" is all
    // that was actually observed - if the field ever starts removing other
    // characters too, this should fail rather than quietly absorb it.
    fillField(this.locators.get('checkout.phone'), order.phone, order.phone.replace(/^\+/, ''));
    cy.get(this.locators.get('checkout.paymentMethodCash')).click();
    cy.get(this.locators.get('checkout.placeOrderButton')).click();
    cy.get(this.locators.get('checkout.confirmOrderYes')).click();
  }

  // One claim: the total /order-success renders is byte-for-byte the total
  // the API computed for THIS market. It carries the whole slice on its own
  // - /order-success persists the last order across direct navigation, so a
  // stale order from a previous run would pass any generic "an order
  // exists" check, and only an exact match on this market's formatted total
  // rules that out.
  //
  // The two cy.get()s above it are synchronisation guards, not claims:
  // they are how Cypress waits for the confirmation screen to render before
  // the total is read. An earlier version also asserted order-id contained
  // "ORDER-", which checked an id-prefix convention rather than any
  // behaviour this scenario is about; it was dropped, and order-id kept
  // only as a render guard.
  assertOrderConfirmation(expected: OrderSummary): void {
    const expectedTotalText = formatOrderTotal(expected.currency, expected.currencySymbol, expected.total);
    cy.get(this.locators.get('orderSuccess.readyMarker')).should('be.visible');
    cy.get(this.locators.get('orderSuccess.orderId')).should('be.visible');
    cy.get(this.locators.get('orderSuccess.orderTotal')).should('have.text', expectedTotalText);
  }
}
