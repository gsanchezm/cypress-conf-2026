import type { CheckoutUiStrategy } from './CheckoutUiStrategy';
import { formatOrderTotal } from '../data/formatOrderTotal';
import type { CheckoutRequestData, OrderSummary } from '../../../core/types';

// One batched cy.prompt() call per method (never per click) - preserves
// the multi-step batching cy.prompt's own docs are built around, and
// keeps each scenario's prompt cost fixed at exactly 2 calls regardless
// of how many form fields it fills. See
// docs/superpowers/specs/2026-08-19-cypress-conf-2026-framework-design.md
// §8 for the free-tier prompt-budget rationale (100/hour; 5 scenarios ×
// 2 calls = 10/run).
export class CyPromptCheckoutUiStrategy implements CheckoutUiStrategy {
  completeCheckout(order: CheckoutRequestData): void {
    const pizzaId = order.items[0]!.pizzaId;
    cy.prompt(
      [
        'Add the pizza with id {pizzaId} to the cart from the catalog page',
        'Confirm adding it to the cart',
        'Go to the checkout page',
        'Enter {address} into the address field',
        "Enter {requiredFieldValue} into this country's required delivery-detail field (zip code, neighborhood, postal code, prefecture, or district, whichever this country uses)",
        'Enter {name} into the full name field',
        'Enter {phone} into the phone field',
        'Select cash as the payment method',
        'Click the place order button',
        'Confirm the order',
      ],
      {
        placeholders: {
          pizzaId,
          address: order.address,
          requiredFieldValue: order.requiredFieldValue,
          name: order.name,
          phone: order.phone,
        },
      },
    );
  }

  assertOrderConfirmation(expected: OrderSummary): void {
    const expectedTotalText = formatOrderTotal(expected.currency, expected.currencySymbol, expected.total);
    cy.prompt(
      ['Verify the order confirmation page is showing', 'Verify the order total shown is exactly {expectedTotalText}'],
      { placeholders: { expectedTotalText } },
    );
  }
}
