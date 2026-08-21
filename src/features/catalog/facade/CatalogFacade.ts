import { CatalogApiClient } from '../api/CatalogApiClient';
import type { SelectorSource } from '@/core/locators/SelectorSource';
import { AUTH_TOKEN_STORAGE_KEY } from '@/core/config/storageKeys';
import { precondition } from '@/core/testing/precondition';
import type { CountryCode, PizzaCatalogResponse } from '@/core/types';

// What a market is expected to produce, on both sides of the atomic run:
// isoCurrency for the API claim, expectedPriceText for the UI claim.
export interface CatalogMarketExpectation {
  countryCode: CountryCode;
  isoCurrency: string;
  expectedPriceText: string;
}

export class CatalogFacade {
  constructor(
    private readonly catalogApi: CatalogApiClient,
    private readonly locators: SelectorSource,
  ) {}

  setMarketAndFetchPizzas(accessToken: string, countryCode: CountryCode): Cypress.Chainable<PizzaCatalogResponse> {
    return this.catalogApi
      .setMarket(accessToken, countryCode)
      .then(() => this.catalogApi.getPizzas(accessToken, countryCode));
  }

  // Same two-phase-visit pattern as AuthFacade.hydrateSessionAndOpenCatalog:
  // visit '/' first so the app's release-invalidation guard doesn't wipe
  // the token before the catalog page ever loads authenticated. See the
  // completed Auth slice's AuthFacade for the original discovery of why
  // this must be two visits, not one with onBeforeLoad.
  //
  // Also writes localStorage's `countryCode` key: confirmed via live
  // browser verification that the rendered catalog page's market/currency
  // is driven entirely by this client-side key, NOT by the backend session
  // state that setMarketAndFetchPizzas's POST /api/store/market updates -
  // calling that endpoint alone and reloading /catalog left the price
  // unchanged. The app's own boot logic re-derives its full
  // `omnipizza-country` Zustand-persist blob from this plain string on its
  // own; writing that blob ourselves is unnecessary.
  openCatalogAuthenticated(accessToken: string, countryCode: CountryCode): void {
    cy.visit('/');
    cy.window().then((win) => {
      win.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
      win.localStorage.setItem('countryCode', countryCode);
    });
    cy.visit('/catalog');
  }

  // The slice's single API-side claim. Folding the envelope currency and
  // every pizza's currency into one Set keeps it to one expect() without
  // losing either half: a response whose envelope says MXN while individual
  // items still carry stale USD produces a two-element Set and fails, which
  // is exactly the case a bare envelope check would have missed.
  //
  // The market echo and the non-empty catalog are preconditions, not
  // claims - a response for the wrong market, or an empty one, means the
  // arrange step is broken, and it would also make the Set check pass
  // vacuously. Those throw rather than assert; see precondition().
  assertApiCurrencyMatchesMarket(response: PizzaCatalogResponse, scenario: CatalogMarketExpectation): void {
    precondition(
      response.countryCode === scenario.countryCode,
      `the catalog response is for market ${scenario.countryCode} (got ${response.countryCode})`,
    );
    precondition(response.pizzas.length > 0, `the catalog for ${scenario.countryCode} carries at least one pizza`);

    const currencies = [...new Set([response.currency, ...response.pizzas.map((pizza) => pizza.currency)])];
    expect(currencies).to.deep.equal([scenario.isoCurrency]);
  }

  // The slice's single UI-side claim: an exact match on p01's rendered
  // price. It has to be exact rather than a format pattern, because a
  // format check cannot distinguish Mexico from the United States (both
  // render "$" + 2 decimals) - and market discrimination is the whole point
  // of this slice.
  //
  // A previous version also looped a format regex over every visible price
  // to prove the rest of the catalog was localized too. Dropped
  // deliberately: assertApiCurrencyMatchesMarket already proves every pizza
  // carries this market's currency in the data, so the loop only added
  // coverage for a shared price component rendering one item differently
  // from the next - a narrow failure mode, not worth a third assertion in a
  // scenario budgeted at one API claim and one UI claim.
  assertCatalogShowsCurrency(scenario: CatalogMarketExpectation): void {
    cy.get(this.locators.get('catalog.readyMarker')).should('be.visible');
    cy.get(this.locators.get('catalog.firstPizzaPrice'))
      .invoke('text')
      .should('eq', scenario.expectedPriceText);
  }
}
