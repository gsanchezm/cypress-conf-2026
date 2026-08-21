import { Before, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { createAuthFacade, createCatalogFacade } from '@support/e2e';
import { AtomicScenario } from '@/core/ui/AtomicScenario';
import type { CatalogMarketExpectation } from '../facade/CatalogFacade';

// countryCode / isoCurrency / expectedPriceText come from
// CatalogMarketExpectation - they are what CatalogFacade's two assert
// methods consume. currencyName is local to the step layer.
interface MarketScenario extends CatalogMarketExpectation {
  currencyName: string; // Must match the Then step's captured text - a
  // mismatch here (e.g. a typo'd Examples row pairing the wrong market with
  // the wrong currency name) throws instead of silently passing, so the
  // Then step text is a real constraint, not decoration.
}

// Prices are for pizza p01 (Margherita, base_price 12.99), live-harvested
// against the real deployed app for all 5 markets - not derived from the
// API's raw currency_symbol field, which doesn't always match what the UI
// actually renders (confirmed divergence for Japan: the API returns the
// ordinary-width yen sign U+00A5, the DOM renders the fullwidth U+FFE5).
const MARKET_SCENARIOS: Record<string, MarketScenario> = {
  'United States': {
    countryCode: 'US',
    isoCurrency: 'USD',
    currencyName: 'US dollars',
    expectedPriceText: '$12.99',
  },
  Mexico: {
    countryCode: 'MX',
    isoCurrency: 'MXN',
    currencyName: 'Mexican pesos',
    expectedPriceText: '$227.97',
  },
  Switzerland: {
    countryCode: 'CH',
    isoCurrency: 'CHF',
    currencyName: 'Swiss francs',
    // The separator between "CHF" and the amount is a no-break space
    // (U+00A0), not a regular space - confirmed via codePointAt() against
    // the live DOM. Written as an explicit escape, not a literal character,
    // since the two are visually indistinguishable in an editor.
    expectedPriceText: 'CHF 10.16',
  },
  Japan: {
    countryCode: 'JP',
    isoCurrency: 'JPY',
    currencyName: 'Japanese yen',
    expectedPriceText: '￥2,051',
  },
  'Saudi Arabia': {
    countryCode: 'SA',
    isoCurrency: 'SAR',
    currencyName: 'Saudi riyals',
    expectedPriceText: '‏٤٨٫٧١ ر.س.‏',
  },
};

let activeScenario: MarketScenario | undefined;

function requireActiveScenario(): MarketScenario {
  if (!activeScenario) {
    throw new Error('Catalog scenario not set - a When step must run before this Then step');
  }
  return activeScenario;
}

// Resets state before every scenario in the suite (not just this slice's
// own) so a scenario can never silently reuse a market left over from the
// previous one if its own When step is ever skipped - the guard above only
// catches "never set", not "stale from last time".
Before(() => {
  activeScenario = undefined;
});

// AtomicScenario.run() fires here, in Then, not in When - matching the
// convention auth.steps.ts documents in its own comment ("Given/When only
// record intent ... the full atomic run happens in the Then step").
function runCatalogScenario(scenario: MarketScenario): void {
  const authFacade = createAuthFacade();
  const catalogFacade = createCatalogFacade();
  let accessToken: string;

  AtomicScenario.for('catalog').run({
    arrangeViaApi: () => {
      authFacade.loginAs('standard').then((session) => {
        accessToken = session.accessToken;
      });
      // No expect() lives inline in a step definition: assertions belong in
      // a named facade method, so "how many claims does this scenario make?"
      // is answerable by reading the step, not by auditing four anonymous
      // expects buried in a callback.
      cy.then(() => catalogFacade.setMarketAndFetchPizzas(accessToken, scenario.countryCode)).then((response) =>
        catalogFacade.assertApiCurrencyMatchesMarket(response, scenario),
      );
    },
    hydrateUi: () => {
      cy.then(() => catalogFacade.openCatalogAuthenticated(accessToken, scenario.countryCode));
    },
    assertUi: () => {
      catalogFacade.assertCatalogShowsCurrency(scenario);
    },
  });
}

When(/^a standard customer browses the catalog in the (.+) market$/, (market: string) => {
  const scenario = MARKET_SCENARIOS[market];
  if (!scenario) {
    throw new Error(`No catalog scenario data registered for market "${market}"`);
  }
  activeScenario = scenario;
});

Then(/^the prices should show in (.+)$/, (currencyName: string) => {
  const scenario = requireActiveScenario();
  if (scenario.currencyName !== currencyName) {
    throw new Error(
      `Then step expected currency "${currencyName}" but the active scenario (market "${scenario.countryCode}") expects "${scenario.currencyName}" - check the Examples table for a mismatched row`,
    );
  }
  runCatalogScenario(scenario);
});
