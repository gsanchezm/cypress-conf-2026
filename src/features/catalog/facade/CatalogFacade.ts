import { CatalogApiClient } from '../api/CatalogApiClient';
import { LocatorProxy } from '../../../core/locators/LocatorProxy';
import { AUTH_TOKEN_STORAGE_KEY } from '../../../core/config/storageKeys';
import type { CountryCode, PizzaCatalogItem } from '../../../core/types';

export class CatalogFacade {
  constructor(
    private readonly catalogApi: CatalogApiClient,
    private readonly locators: LocatorProxy,
  ) {}

  setMarketAndFetchPizzas(accessToken: string, countryCode: CountryCode): Cypress.Chainable<PizzaCatalogItem[]> {
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

  // Matches the full rendered price format (symbol + digit grouping/decimals),
  // not just a bare currency-symbol substring: a substring check on "$" alone
  // would make the US scenario tautological (US is the app's default market,
  // so "$" would appear even if setMarket/countryCode hydration/the
  // X-Country-Code header were all broken). A format regex per market (see
  // the pricePattern values in catalog.steps.ts) forces the assertion to
  // actually depend on the market having been switched correctly.
  assertCatalogShowsCurrency(pricePattern: RegExp): void {
    cy.get(this.locators.get('catalog.readyMarker')).should('be.visible');
    cy.get(this.locators.get('catalog.firstPizzaPrice'))
      .invoke('text')
      .should('match', pricePattern);
  }
}
