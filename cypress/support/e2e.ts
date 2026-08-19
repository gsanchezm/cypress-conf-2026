import { AuthApiClient } from '../../src/features/auth/api/AuthApiClient';
import { AuthFacade } from '../../src/features/auth/facade/AuthFacade';
import { LocatorProxy } from '../../src/core/locators/LocatorProxy';
import authLocators from '../../src/features/auth/locators/auth.locators.json';

export function createAuthFacade(): AuthFacade {
  return new AuthFacade(new AuthApiClient(), new LocatorProxy(authLocators));
}
