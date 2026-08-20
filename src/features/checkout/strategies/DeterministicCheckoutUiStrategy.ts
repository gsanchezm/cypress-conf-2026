import type { CheckoutUiStrategy } from './CheckoutUiStrategy';
import { CHECKOUT_COUNTRY_STRATEGIES } from './CheckoutCountryStrategy';
import { formatOrderTotal } from '../data/formatOrderTotal';
import { LocatorProxy } from '../../../core/locators/LocatorProxy';
import type { CheckoutRequestData, OrderSummary } from '../../../core/types';

export class DeterministicCheckoutUiStrategy implements CheckoutUiStrategy {
  constructor(private readonly locators: LocatorProxy) {}

  // The two-step confirm (place-order button opens a modal; confirm-order-yes
  // is the real submit) is a live-confirmed fact, not an assumption -
  // clicking placeOrderButton alone does not submit the order.
  completeCheckout(order: CheckoutRequestData): void {
    const strategy = CHECKOUT_COUNTRY_STRATEGIES[order.countryCode];
    const pizzaId = order.items[0]!.pizzaId;

    const addToCartSelector = this.locators.get('catalog.addToCart').replace('{pizzaId}', pizzaId);
    cy.get(addToCartSelector).click();
    cy.get(this.locators.get('catalog.confirmAddToCart')).click();

    cy.visit('/checkout');
    cy.get(this.locators.get('checkout.readyMarker')).should('be.visible');
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
