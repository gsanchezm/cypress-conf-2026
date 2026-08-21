import type { CheckoutUiStrategy } from './CheckoutUiStrategy';
import { formatOrderTotal } from '../data/formatOrderTotal';
import { preparePrompt } from '@/core/prompts/preparePrompt';
import checkoutPrompts from '../prompts/checkout.prompt.md';
import type { CheckoutRequestData, OrderSummary } from '@/core/types';

// The prompt text itself lives in checkout.prompt.md, one section per
// method - see that file for the batching rationale and for why the
// delivery-detail step is the strongest case for cy.prompt in this suite.
// This class is only the wiring: it decides which values fill the
// placeholders, and preparePrompt() fails loudly if the two sides ever
// drift apart.
export class CyPromptCheckoutUiStrategy implements CheckoutUiStrategy {
  completeCheckout(order: CheckoutRequestData): void {
    const prompt = preparePrompt(checkoutPrompts, 'completeCheckout', {
      pizzaId: order.items[0]!.pizzaId,
      address: order.address,
      requiredFieldValue: order.requiredFieldValue,
      name: order.name,
      phone: order.phone,
    });
    cy.prompt(prompt.steps, { placeholders: prompt.placeholders });
  }

  assertOrderConfirmation(expected: OrderSummary): void {
    const prompt = preparePrompt(checkoutPrompts, 'assertOrderConfirmation', {
      expectedTotalText: formatOrderTotal(expected.currency, expected.currencySymbol, expected.total),
    });
    cy.prompt(prompt.steps, { placeholders: prompt.placeholders });
  }
}
