import { When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { createAuthFacade, createCatalogFacade } from '../../../../cypress/support/e2e';
import { AtomicScenario } from '../../../core/ui/AtomicScenario';
import type { CountryCode } from '../../../core/types';

// "Given a standard customer" is not redefined here: this project's
// step-definition glob (package.json's cypress-cucumber-preprocessor
// config, "src/features/**/steps/*.steps.ts") is loaded globally across all
// features, not scoped per feature directory - auth.steps.ts already
// registers this exact step text. Redefining it here caused a real
// "Multiple matching step definitions" failure when this suite was run
// (confirmed via `cypress run`), so this slice reuses auth's Given instead
// of duplicating it. Its only effect (setting auth.steps.ts's module-level
// userKey) is irrelevant here since runCatalogScenario always logs in as
// 'standard' directly.

function runCatalogScenario(countryCode: CountryCode, currencySymbol: string): void {
  const authFacade = createAuthFacade();
  const catalogFacade = createCatalogFacade();
  let accessToken: string;

  AtomicScenario.for('catalog').run({
    arrangeViaApi: () => {
      authFacade.loginAs('standard').then((session) => {
        accessToken = session.accessToken;
      });
      cy.then(() => catalogFacade.setMarketAndFetchPizzas(accessToken, countryCode));
    },
    hydrateUi: () => {
      cy.then(() => catalogFacade.openCatalogAuthenticated(accessToken, countryCode));
    },
    assertUi: () => {
      catalogFacade.assertCatalogShowsCurrency(currencySymbol);
    },
  });
}

When('they browse the catalog in the United States market', () => {
  runCatalogScenario('US', '$');
});

// The JP market renders the fullwidth yen sign (U+FFE5, "￥"), not the
// ordinary yen sign (U+00A5) - confirmed against the live catalog page's
// rendered DOM during Task 2's locator harvest.
When('they browse the catalog in the Japan market', () => {
  runCatalogScenario('JP', '￥');
});

Then('the prices should show in US dollars', () => {});
Then('the prices should show in Japanese yen', () => {});
