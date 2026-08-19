import { AuthApiClient } from '../../src/features/auth/api/AuthApiClient';
import { AuthFacade } from '../../src/features/auth/facade/AuthFacade';
import { LocatorProxy } from '../../src/core/locators/LocatorProxy';
import authLocators from '../../src/features/auth/locators/auth.locators.json';
import { CatalogApiClient } from '../../src/features/catalog/api/CatalogApiClient';
import { CatalogFacade } from '../../src/features/catalog/facade/CatalogFacade';
import catalogLocators from '../../src/features/catalog/locators/catalog.locators.json';

export function createAuthFacade(): AuthFacade {
  return new AuthFacade(new AuthApiClient(), new LocatorProxy(authLocators));
}

export function createCatalogFacade(): CatalogFacade {
  return new CatalogFacade(new CatalogApiClient(), new LocatorProxy(catalogLocators));
}
