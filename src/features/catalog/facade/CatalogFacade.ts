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

  // Checks for the currency symbol in the price element's text. This is
  // sufficient to distinguish the two markets this slice currently tests
  // (US "$" vs JP "￥") but NOT sufficient if a future scenario adds MX,
  // which also uses "$" (confirmed via /api/countries) - if MX is ever
  // added, switch this to assert on a full price string or another
  // distinguishing signal, not just the symbol.
  assertCatalogShowsCurrency(currencySymbol: string): void {
    cy.get(this.locators.get('catalog.readyMarker')).should('be.visible');
    cy.get(this.locators.get('catalog.firstPizzaPrice')).should('contain.text', currencySymbol);
  }
}
