import { When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { createAuthFacade, createCatalogFacade } from '../../../../cypress/support/e2e';
import { AtomicScenario } from '../../../core/ui/AtomicScenario';
import type { CountryCode } from '../../../core/types';

interface CatalogScenarioParams {
  countryCode: CountryCode;
  currency: string; // ISO code asserted against the API response, e.g. 'USD' / 'JPY'.
  pricePattern: RegExp; // Full rendered-price format asserted against the UI.
}

let scenarioParams: CatalogScenarioParams | undefined;

function requireScenarioParams(): CatalogScenarioParams {
  if (!scenarioParams) {
    throw new Error('Catalog scenario params not set - a When step must run before this Then step');
  }
  return scenarioParams;
}

// AtomicScenario.run() fires here, in Then, not in When - matching the
// convention auth.steps.ts documents in its own comment ("Given/When only
// record intent ... the full atomic run happens in the Then step"). When
// only records which market this scenario is about; Then is what actually
// proves it. Params are stashed in module-level state (not a When-handler
// closure) because the run now happens in a different step callback than
// the one that knows the params - Cucumber's guaranteed per-scenario
// sequential step order (each scenario's own When always completes before
// its own Then starts, before the next scenario begins) makes this exactly
// as safe as the identical pattern already shipped in auth.steps.ts's
// userKey/requireUserKey().
function runCatalogScenario(params: CatalogScenarioParams): void {
  const authFacade = createAuthFacade();
  const catalogFacade = createCatalogFacade();
  let accessToken: string;

  AtomicScenario.for('catalog').run({
    arrangeViaApi: () => {
      authFacade.loginAs('standard').then((session) => {
        accessToken = session.accessToken;
      });
      // Assert on the fetched pizzas' `currency` field, not just fetch and
      // discard them - US is the app's default market, so without this the
      // US scenario would pass green even if setMarket, the countryCode
      // localStorage hydration, and the X-Country-Code header were all
      // completely broken; only the JP scenario would prove anything works.
      // Asserting `currency` (ISO code, e.g. 'USD'/'JPY') rather than
      // `currencySymbol` deliberately avoids the API's ordinary-width ¥
      // (U+00A5) vs the DOM's fullwidth ￥ (U+FFE5) - reusing the same
      // symbol constant for both the API and UI assertions would silently
      // reintroduce that exact codepoint bug.
      cy.then(() => catalogFacade.setMarketAndFetchPizzas(accessToken, params.countryCode)).then((pizzas) => {
        expect(pizzas.length).to.be.greaterThan(0);
        expect(pizzas.every((pizza) => pizza.currency === params.currency)).to.be.true;
      });
    },
    hydrateUi: () => {
      cy.then(() => catalogFacade.openCatalogAuthenticated(accessToken, params.countryCode));
    },
    assertUi: () => {
      catalogFacade.assertCatalogShowsCurrency(params.pricePattern);
    },
  });
}

When('a standard customer browses the catalog in the United States market', () => {
  scenarioParams = { countryCode: 'US', currency: 'USD', pricePattern: /^\$\d+\.\d{2}$/ };
});

// The JP market renders the fullwidth yen sign (U+FFE5, "￥"), not the
// ordinary yen sign (U+00A5) - confirmed against the live catalog page's
// rendered DOM during Task 2's locator harvest. The live API's /pizzas
// response uses the ordinary-width ¥ for currencySymbol, which is why the
// arrangeViaApi assertion above checks `currency` ('JPY') instead.
When('a standard customer browses the catalog in the Japan market', () => {
  scenarioParams = { countryCode: 'JP', currency: 'JPY', pricePattern: /^￥[\d,]+$/ };
});

Then('the prices should show in US dollars', () => {
  runCatalogScenario(requireScenarioParams());
});

Then('the prices should show in Japanese yen', () => {
  runCatalogScenario(requireScenarioParams());
});
