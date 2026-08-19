import { CatalogApiClient } from '../api/CatalogApiClient';
import { LocatorProxy } from '../../../core/locators/LocatorProxy';
import { AUTH_TOKEN_STORAGE_KEY } from '../../../core/config/storageKeys';
import type { CountryCode, PizzaCatalogResponse } from '../../../core/types';

export class CatalogFacade {
  constructor(
    private readonly catalogApi: CatalogApiClient,
    private readonly locators: LocatorProxy,
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

  // Two layers of proof: an exact-match on p01's price (proves this specific
  // market rendered - a format-only check can't distinguish Mexico from the
  // United States, since both render "$" + 2 decimals), plus a format-match
  // across every visible price (proves the whole catalog is consistently
  // localized, not just the one pizza we happen to assert exactly).
  assertCatalogShowsCurrency(scenario: { expectedPriceText: string; pricePattern: RegExp }): void {
    cy.get(this.locators.get('catalog.readyMarker')).should('be.visible');
    cy.get(this.locators.get('catalog.firstPizzaPrice'))
      .invoke('text')
      .should('eq', scenario.expectedPriceText);
    cy.get(this.locators.get('catalog.allPizzaPrices'))
      .should('have.length.greaterThan', 1)
      .each(($price) => {
        expect($price.text()).to.match(scenario.pricePattern);
      });
  }
}
