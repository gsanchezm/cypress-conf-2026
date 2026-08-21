import { AuthApiClient } from '@/features/auth/api/AuthApiClient';
import { AuthFacade } from '@/features/auth/facade/AuthFacade';
import { LocatorProxy } from '@/core/locators/LocatorProxy';
import authLocators from '@/features/auth/locators/auth.locators.json';
import { CatalogApiClient } from '@/features/catalog/api/CatalogApiClient';
import { CatalogFacade } from '@/features/catalog/facade/CatalogFacade';
import catalogLocators from '@/features/catalog/locators/catalog.locators.json';
import { CheckoutApiClient } from '@/features/checkout/api/CheckoutApiClient';
import { CheckoutFacade } from '@/features/checkout/facade/CheckoutFacade';
import { DeterministicCheckoutUiStrategy } from '@/features/checkout/strategies/DeterministicCheckoutUiStrategy';
import { CyPromptCheckoutUiStrategy } from '@/features/checkout/strategies/CyPromptCheckoutUiStrategy';
import checkoutLocators from '@/features/checkout/locators/checkout.locators.json';

export function createAuthFacade(): AuthFacade {
  return new AuthFacade(new AuthApiClient(), new LocatorProxy(authLocators));
}

export function createCatalogFacade(): CatalogFacade {
  return new CatalogFacade(new CatalogApiClient(), new LocatorProxy(catalogLocators));
}

export function createCheckoutFacade(): CheckoutFacade {
  const uiStrategy =
    Cypress.env('UI_STRATEGY') === 'cyPrompt'
      ? new CyPromptCheckoutUiStrategy()
      : new DeterministicCheckoutUiStrategy(new LocatorProxy(checkoutLocators));
  return new CheckoutFacade(new CheckoutApiClient(), uiStrategy);
}
