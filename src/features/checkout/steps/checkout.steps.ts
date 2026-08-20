import { Before, Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { createAuthFacade, createCheckoutFacade } from '../../../../cypress/support/e2e';
import { AtomicScenario } from '../../../core/ui/AtomicScenario';
import type { CountryCode } from '../../../core/types';

interface CheckoutScenario {
  countryCode: CountryCode;
  requiredFieldLocatorKey: 'requiredFieldZipCode' | 'requiredFieldColonia' | 'requiredFieldDistrict';
  requiredFieldValue: string;
  address: string;
}

// Live-harvested 2026-08-19 - see
// docs/superpowers/plans/2026-08-19-cypress-conf-2026-checkout-slice.md for
// the full per-market DOM-testid/API-key table this data is drawn from.
const CHECKOUT_SCENARIOS: Record<string, CheckoutScenario> = {
  'United States': {
    countryCode: 'US',
    requiredFieldLocatorKey: 'requiredFieldZipCode',
    requiredFieldValue: '90210',
    address: '742 Evergreen Terrace',
  },
  Mexico: {
    countryCode: 'MX',
    requiredFieldLocatorKey: 'requiredFieldColonia',
    requiredFieldValue: 'Polanco',
    address: 'Av. Reforma 123',
  },
};

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

// The order is placed exactly once, via the real UI form, in hydrateUi -
// that's the state-changing action under test (matching how auth.steps.ts's
// locked-out scenario already treats a UI-driven action as hydrateUi, not
// arrangeViaApi). arrangeViaApi is limited to login + cart seeding.
function runCheckoutScenario(scenario: CheckoutScenario): void {
  const authFacade = createAuthFacade();
  const checkoutFacade = createCheckoutFacade();
  let accessToken: string;

  AtomicScenario.for('checkout').run({
    arrangeViaApi: () => {
      authFacade.loginAs('standard').then((session) => {
        accessToken = session.accessToken;
      });
    },
    hydrateUi: () => {
      cy.then(() => {
        checkoutFacade.openCatalogAuthenticated(accessToken, scenario.countryCode);
        checkoutFacade.addPizzaToCartViaUi('p01');
        checkoutFacade.fillAndSubmitCheckoutForm(
          {
            countryCode: scenario.countryCode,
            items: [{ pizzaId: 'p01', quantity: 1, size: 'small' }],
            name: 'Test Harvester',
            address: scenario.address,
            phone: '+15551234567',
            paymentMethod: 'cash',
            requiredFieldValue: scenario.requiredFieldValue,
            tipPercentage: 0,
          },
          scenario.requiredFieldLocatorKey,
        );
      });
    },
    assertUi: () => {
      checkoutFacade.assertOrderSuccess();
    },
  });
}

// A single regex with an optional "the" - "in the United States" and "in
// Mexico" both need to match here, and two separate step definitions for
// this (one with "the", one without) would collide on "in the United
// States" (both would match it), producing Cucumber's "Multiple matching
// step definitions" error - the same defect class an earlier draft of the
// Catalog slice hit and fixed by scoping to one precise regex instead.
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

Then('the order should be confirmed', () => {});
