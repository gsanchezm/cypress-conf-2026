import { createAuthFacade } from '@support/e2e';
import { LocatorProxy, type LocatorTree } from '@/core/locators/LocatorProxy';
import { leafKeys } from '@/core/locators/leafKeys';
import { harvestAttributes, mergeHarvest } from '@/core/locators/harvestFallbacks';
import type { FallbackMap } from '@/core/locators/fallbackTiers';
import { fillField } from '@/core/ui/fillField';
import { locate } from '@/core/ui/locate';
import { precondition } from '@/core/testing/precondition';
import { AUTH_TOKEN_STORAGE_KEY } from '@/core/config/storageKeys';
import { CheckoutApiClient } from '@/features/checkout/api/CheckoutApiClient';
import { CHECKOUT_COUNTRY_STRATEGIES } from '@/features/checkout/strategies/CheckoutCountryStrategy';
import { toCartItemBody } from '@/features/checkout/data/toCartItemBody';
import authLocators from '@/features/auth/locators/auth.locators.json';
import catalogLocators from '@/features/catalog/locators/catalog.locators.json';
import checkoutLocators from '@/features/checkout/locators/checkout.locators.json';
import type { CountryCode } from '@/core/types';

// Not a test of the product - a tool that regenerates the fallback maps the
// a11y healer reads (src/features/<slice>/locators/<slice>.fallbacks.json)
// from the live app, all five markets, RTL included. It lives outside
// cypress/e2e so the suite and CI never run it; `pnpm harvest:locators`
// points specPattern here from the CLI, so cypress.config.ts is untouched.
//
// cypress tap aria would have been the natural source, but it only attaches
// to `cypress open` and crashes on exit under Windows + Node 24, so the
// harvest reads the DOM itself with the same jQuery engine cy.get uses.
//
// Each market's `it` still makes exactly one claim: every registered,
// non-templated key on the screens it visited matched exactly one element.
// Everything else here is a guard or a read. One real order is placed per
// market to reach /order-success (5 per harvest run).

type Slice = 'auth' | 'catalog' | 'checkout';

const SLICES: Record<Slice, { tree: LocatorTree; output: string }> = {
  auth: { tree: authLocators, output: 'src/features/auth/locators/auth.fallbacks.json' },
  catalog: { tree: catalogLocators, output: 'src/features/catalog/locators/catalog.fallbacks.json' },
  checkout: { tree: checkoutLocators, output: 'src/features/checkout/locators/checkout.fallbacks.json' },
};

const MARKETS: CountryCode[] = ['US', 'MX', 'CH', 'JP', 'SA'];
const REQUIRED_FIELD_KEYS = ['requiredFieldZipCode', 'requiredFieldColonia', 'requiredFieldDistrict'] as const;

// Renders inside the confirm modal, which only exists once the place-order
// button has been clicked; harvested from the open modal, not the form.
const CONFIRM_MODAL_KEY = 'checkout.confirmOrderYes';

const SCENARIOS: Record<CountryCode, { requiredFieldValue: string; address: string }> = {
  US: { requiredFieldValue: '90210', address: '742 Evergreen Terrace' },
  MX: { requiredFieldValue: 'Polanco', address: 'Av. Reforma 123' },
  CH: { requiredFieldValue: '8001', address: 'Bahnhofstrasse 1' },
  JP: { requiredFieldValue: '東京都', address: '東京都渋谷区1-1-1' },
  SA: { requiredFieldValue: 'Al Olaya', address: '123 King Fahd Road' },
};

const harvested: Record<Slice, FallbackMap> = { auth: {}, catalog: {}, checkout: {} };

// One read of the current document, no retry: every caller waits for the
// screen's ready marker first. A key whose primary matches zero elements is
// reported through `missing`; one that matches several (allPizzaPrices, a
// prefix selector) records nothing, because no tier could ever pick it out.
function harvestKeys(slice: Slice, keys: readonly string[], missing: string[]): void {
  const proxy = new LocatorProxy(SLICES[slice].tree);
  cy.document().then((doc) => {
    keys.forEach((key) => {
      const matches = Cypress.$(proxy.get(key), doc);
      if (matches.length === 0) missing.push(key);
      if (matches.length !== 1) return;
      harvested[slice] = mergeHarvest(harvested[slice], key, harvestAttributes(matches[0]));
    });
  });
}

// Every registered, non-templated key under `screen.`, minus the ones known
// not to be on this screen right now (another market's required field, a
// modal that is not open yet).
function harvestScreen(slice: Slice, screen: string, expectedAbsent: readonly string[], missing: string[]): void {
  const keys = leafKeys(SLICES[slice].tree).filter((key) => key.startsWith(`${screen}.`) && !expectedAbsent.includes(key));
  harvestKeys(slice, keys, missing);
}

function seedCartFromBrowserSession(): void {
  cy.window().then((win) => {
    const token = win.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    precondition(token !== null, 'the UI login left an auth token in localStorage');
    return new CheckoutApiClient().seedCart(token, [toCartItemBody({ pizzaId: 'p01', quantity: 1, size: 'small' })]);
  });
}

// Mirrors DeterministicCheckoutUiStrategy.completeCheckout from the address
// field down to the payment method. Duplicated on purpose: the strategy has
// no "between render and fill" seam, and adding a public hook to a product
// strategy for a tool is not worth it.
function fillCheckoutForm(countryCode: CountryCode): void {
  const checkout = new LocatorProxy(checkoutLocators);
  const strategy = CHECKOUT_COUNTRY_STRATEGIES[countryCode];
  fillField(checkout, 'checkout.address', SCENARIOS[countryCode].address);
  fillField(checkout, `checkout.${strategy.requiredFieldLocatorKey}`, SCENARIOS[countryCode].requiredFieldValue);
  fillField(checkout, 'checkout.fullName', 'Test Harvester');
  fillField(checkout, 'checkout.phone', '+15551234567', '15551234567');
  locate(checkout, 'checkout.paymentMethodCash').click();
}

// Registry order, so the committed map reads side by side with the
// locators file instead of in first-seen-market order.
function inRegistryOrder(slice: Slice): FallbackMap {
  const map = harvested[slice];
  return Object.fromEntries(leafKeys(SLICES[slice].tree).flatMap((key) => (key in map ? [[key, map[key]]] : [])));
}

function assertEveryVisitedKeyResolved(missing: readonly string[]): void {
  expect(missing).to.deep.equal([]);
}

describe('fallback map harvest', () => {
  MARKETS.forEach((countryCode) => {
    it(`harvests ${countryCode}`, () => {
      const missing: string[] = [];
      const auth = new LocatorProxy(authLocators);
      const catalog = new LocatorProxy(catalogLocators);
      const checkout = new LocatorProxy(checkoutLocators);
      const strategy = CHECKOUT_COUNTRY_STRATEGIES[countryCode];
      const otherMarketsFields = REQUIRED_FIELD_KEYS.filter((key) => key !== strategy.requiredFieldLocatorKey).map(
        (key) => `checkout.${key}`,
      );

      cy.visit('/');
      locate(auth, 'login.usernameInput').should('be.visible');
      // The locked-out error only renders after a failed submit; not visited here.
      harvestScreen('auth', 'login', ['login.lockedOutError'], missing);

      createAuthFacade().loginViaUiWithMarket('standard', countryCode);
      locate(auth, 'landing.readyMarker').should('be.visible');
      harvestScreen('auth', 'landing', [], missing);
      // The header (and its logout button) renders before the catalog body
      // does; wait for the catalog the way CatalogFacade does.
      locate(catalog, 'catalog.readyMarker').should('be.visible');
      locate(catalog, 'catalog.firstPizzaPrice').should('be.visible');
      harvestScreen('catalog', 'catalog', [], missing);

      seedCartFromBrowserSession();
      cy.visit('/checkout');
      locate(checkout, 'checkout.readyMarker').should('be.visible');
      locate(checkout, `checkout.${strategy.requiredFieldLocatorKey}`, { timeout: 10000 }).should('be.visible');
      harvestScreen('checkout', 'checkout', [...otherMarketsFields, CONFIRM_MODAL_KEY], missing);

      fillCheckoutForm(countryCode);
      locate(checkout, 'checkout.placeOrderButton').click();
      locate(checkout, CONFIRM_MODAL_KEY).should('be.visible');
      harvestKeys('checkout', [CONFIRM_MODAL_KEY], missing);
      locate(checkout, CONFIRM_MODAL_KEY).click();

      locate(checkout, 'orderSuccess.readyMarker').should('be.visible');
      locate(checkout, 'orderSuccess.orderId').should('be.visible');
      harvestScreen('checkout', 'orderSuccess', [], missing);

      cy.then(() => assertEveryVisitedKeyResolved(missing));
    });
  });

  after(() => {
    (Object.keys(SLICES) as Slice[]).forEach((slice) => {
      cy.writeFile(SLICES[slice].output, inRegistryOrder(slice));
    });
  });
});
