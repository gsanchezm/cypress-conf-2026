import type { CheckoutRequestData, OrderSummary } from '../../../core/types';

// Scoped at business-action granularity (one method per Gherkin When step,
// not per click) - a per-click interface would throw away cy.prompt's own
// multi-step batching, which is the whole point of using it. See
// docs/superpowers/specs/2026-08-19-cypress-conf-2026-framework-design.md
// §8.
export interface CheckoutUiStrategy {
  completeCheckout(order: CheckoutRequestData): void;
  assertOrderConfirmation(expected: OrderSummary): void;
}
