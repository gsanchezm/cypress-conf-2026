import { Before, Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { createAuthFacade, createCheckoutFacade } from '@support/e2e';
import { AtomicScenario } from '@/core/ui/AtomicScenario';
import type { CountryCode, CartItemRequest, OrderSummary } from '@/core/types';

interface CheckoutScenario {
  countryCode: CountryCode;
  requiredFieldValue: string;
  address: string;
}

// Live-harvested 2026-08-19/20 - see
// docs/superpowers/plans/2026-08-19-cypress-conf-2026-checkout-slice.md for
// the full per-market DOM-testid/API-key table. Only market-specific INPUT
// values live here; which DOM field/API key each market uses comes from
// CHECKOUT_COUNTRY_STRATEGIES (the Strategy registry), not duplicated here.
const CHECKOUT_SCENARIOS: Record<string, CheckoutScenario> = {
  'United States': { countryCode: 'US', requiredFieldValue: '90210', address: '742 Evergreen Terrace' },
  Mexico: { countryCode: 'MX', requiredFieldValue: 'Polanco', address: 'Av. Reforma 123' },
  Switzerland: { countryCode: 'CH', requiredFieldValue: '8001', address: 'Bahnhofstrasse 1' },
  Japan: { countryCode: 'JP', requiredFieldValue: '東京都', address: '東京都渋谷区1-1-1' },
  'Saudi Arabia': { countryCode: 'SA', requiredFieldValue: 'Al Olaya', address: '123 King Fahd Road' },
};

const ITEMS: CartItemRequest[] = [{ pizzaId: 'p01', quantity: 1, size: 'small' }];

let activeScenario: CheckoutScenario | undefined;

function requireActiveScenario(): CheckoutScenario {
  if (!activeScenario) {
    throw new Error('No checkout scenario set - a Given step must run before this step');
  }
  return activeScenario;
}

Before(() => {
  activeScenario = undefined;
});

// Exercises the checkout action twice, same precedent as auth.steps.ts's
// locked-out scenario: once via a direct API call in arrangeViaApi (proves
// the checkout API contract - status, computed totals, and is what makes
// CheckoutRequestBuilder/CheckoutCountryStrategy/CheckoutApiClient genuinely
// load-bearing, not unused code), and once via the real UI form in
// hydrateUi (proves the actual user-facing flow works - that's the point
// of testing Checkout at all). Both create real, separate orders.
function runCheckoutScenario(scenario: CheckoutScenario): void {
  const authFacade = createAuthFacade();
  const checkoutFacade = createCheckoutFacade();
  let accessToken: string;
  let expectedOrder: OrderSummary;

  AtomicScenario.for('checkout').run({
    arrangeViaApi: () => {
      authFacade.loginAs('standard').then((session) => {
        expect(session.accessToken).to.be.a('string').and.not.be.empty;
        accessToken = session.accessToken;
      });
      cy.then(() => checkoutFacade.seedCartViaApi(accessToken, scenario.countryCode, ITEMS))
        .then((subtotal) =>
          checkoutFacade.checkoutViaApi(
            accessToken,
            {
              countryCode: scenario.countryCode,
              items: ITEMS,
              name: 'Test Harvester',
              address: scenario.address,
              phone: '+15551234567',
              paymentMethod: 'cash',
              requiredFieldValue: scenario.requiredFieldValue,
              tipPercentage: 0,
            },
            subtotal,
          ),
        )
        .then((order) => {
          expect(order.status).to.equal('pending');
          expect(order.total).to.be.greaterThan(0);
          expectedOrder = order;
        });
    },
    hydrateUi: () => {
      cy.then(() => {
        authFacade.loginViaUiWithMarket('standard', scenario.countryCode);
        authFacade.assertLandedOnCatalog();
        checkoutFacade.completeCheckoutViaUi({
          countryCode: scenario.countryCode,
          items: ITEMS,
          name: 'Test Harvester',
          address: scenario.address,
          phone: '+15551234567',
          paymentMethod: 'cash',
          requiredFieldValue: scenario.requiredFieldValue,
          tipPercentage: 0,
        });
      });
    },
    assertUi: () => {
      cy.then(() => checkoutFacade.assertOrderConfirmation(expectedOrder));
    },
  });
}

Given(/^a standard customer with a pizza in their cart in (?:the )?(.+)$/, (market: string) => {
  const scenario = CHECKOUT_SCENARIOS[market];
  if (!scenario) {
    throw new Error(`No checkout scenario data registered for market "${market}"`);
  }
  activeScenario = scenario;
});

When('they complete checkout with their zip code', () => {
  runCheckoutScenario(requireActiveScenario());
});

When('they complete checkout with their neighborhood', () => {
  runCheckoutScenario(requireActiveScenario());
});

When('they complete checkout with their postal code', () => {
  runCheckoutScenario(requireActiveScenario());
});

When('they complete checkout with their prefecture', () => {
  runCheckoutScenario(requireActiveScenario());
});

When('they complete checkout with their district', () => {
  runCheckoutScenario(requireActiveScenario());
});

Then('the order should be confirmed', () => {});
