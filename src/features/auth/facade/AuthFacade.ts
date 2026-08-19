import { AuthApiClient } from '../api/AuthApiClient';
import { LocatorProxy } from '../../../core/locators/LocatorProxy';
import { UserFactory, type DeterministicUserKey } from '../data/UserFactory';
import type { AuthSession } from '../../../core/types';

export class AuthFacade {
  constructor(
    private readonly authApi: AuthApiClient,
    private readonly locators: LocatorProxy,
  ) {}

  // API-only: returns the session, never touches localStorage. Cypress can
  // only safely write localStorage for the app's origin AFTER cy.visit() has
  // navigated there - doing it here (before any visit) would write to the
  // wrong window/origin. Hydration is the step definition's job, after visiting.
  loginAs(userKey: DeterministicUserKey): Cypress.Chainable<AuthSession> {
    const user = UserFactory.deterministic(userKey);
    return this.authApi.login(user.username, user.password);
  }

  attemptLoginAs(userKey: DeterministicUserKey): Cypress.Chainable<Cypress.Response<unknown>> {
    const user = UserFactory.deterministic(userKey);
    return this.authApi.attemptLogin(user.username, user.password);
  }

  submitLoginFormAs(userKey: DeterministicUserKey): void {
    const user = UserFactory.deterministic(userKey);
    cy.get(this.locators.get('login.usernameInput')).type(user.username);
    cy.get(this.locators.get('login.passwordInput')).type(user.password);
    cy.get(this.locators.get('login.submitButton')).click();
  }

  assertLandedOnCatalog(): void {
    cy.get(this.locators.get('landing.readyMarker')).should('be.visible');
  }

  // Asserts on the message text, not just visibility: the harvested
  // selector (login-error) is a generic login-failure element, not
  // locked-out-specific - it likely renders for other failures too (wrong
  // password, etc.), so visibility alone wouldn't prove this scenario
  // specifically hit the locked-out path rather than some other failure.
  assertLockedOutMessageVisible(): void {
    cy.get(this.locators.get('login.lockedOutError'))
      .should('be.visible')
      .and('contain.text', 'locked out');
  }
}
