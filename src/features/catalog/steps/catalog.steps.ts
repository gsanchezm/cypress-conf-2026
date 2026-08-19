import { Before, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { createAuthFacade, createCatalogFacade } from '../../../../cypress/support/e2e';
import { AtomicScenario } from '../../../core/ui/AtomicScenario';
import type { CountryCode } from '../../../core/types';

interface MarketScenario {
  countryCode: CountryCode;
  isoCurrency: string; // Asserted against the API response's `currency` field.
  currencyName: string; // Must match the Then step's captured text - a
  // mismatch here (e.g. a typo'd Examples row pairing the wrong market with
  // the wrong currency name) throws instead of silently passing, so the
  // Then step text is a real constraint, not decoration.
  expectedPriceText: string; // Exact rendered text of pizza p01's price -
  // proves the specific market's pricing, not just "some currency showed
  // up". A format-only check can't distinguish Mexico from the United
  // States (both render "$" + 2 decimals), so this must be an exact match.
  pricePattern: RegExp; // Format check applied to every visible price (not
  // just p01), proving the whole catalog is consistently localized.
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
    pricePattern: /^\$\d+\.\d{2}$/,
  },
  Mexico: {
    countryCode: 'MX',
    isoCurrency: 'MXN',
    currencyName: 'Mexican pesos',
    expectedPriceText: '$227.97',
    pricePattern: /^\$\d+\.\d{2}$/,
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
    pricePattern: /^CHF \d+\.\d{2}$/,
  },
  Japan: {
    countryCode: 'JP',
    isoCurrency: 'JPY',
    currencyName: 'Japanese yen',
    expectedPriceText: '￥2,051',
    pricePattern: /^￥[\d,]+$/,
  },
  'Saudi Arabia': {
    countryCode: 'SA',
    isoCurrency: 'SAR',
    currencyName: 'Saudi riyals',
    expectedPriceText: '‏٤٨٫٧١ ر.س.‏',
    pricePattern: /^‏[٠-٩٫]+ ر\.س\.‏$/,
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
      cy.then(() => catalogFacade.setMarketAndFetchPizzas(accessToken, scenario.countryCode)).then(
        (response) => {
          // Top-level metadata proves the response envelope reflects the
          // requested market; the per-pizza check proves every mapped item
          // actually carries that market's currency too - a response could
          // pass the envelope check while individual items still carried
          // stale data from a different market, and top-level alone
          // wouldn't catch it.
          expect(response.countryCode).to.equal(scenario.countryCode);
          expect(response.currency).to.equal(scenario.isoCurrency);
          expect(response.pizzas.length).to.be.greaterThan(0);
          expect(response.pizzas.every((pizza) => pizza.currency === scenario.isoCurrency)).to.be.true;
        },
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
