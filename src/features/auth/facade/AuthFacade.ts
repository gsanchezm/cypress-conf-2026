import { AuthApiClient } from '../api/AuthApiClient';
import { LocatorProxy } from '@/core/locators/LocatorProxy';
import { fillField } from '@/core/ui/fillField';
import { UserFactory, type DeterministicUserKey } from '../data/UserFactory';
import type { AuthSession, CountryCode } from '@/core/types';
import { AUTH_TOKEN_STORAGE_KEY } from '@/core/config/storageKeys';

export class AuthFacade {
  constructor(
    private readonly authApi: AuthApiClient,
    private readonly locators: LocatorProxy,
  ) {}

  // API-only: returns the session, never touches localStorage. Cypress can
  // only safely write localStorage for the app's origin AFTER cy.visit() has
  // navigated there - doing it here (before any visit) would write to the
  // wrong window/origin. Hydration happens via hydrateSessionAndOpenCatalog
  // below, not here.
  loginAs(userKey: DeterministicUserKey): Cypress.Chainable<AuthSession> {
    const user = UserFactory.deterministic(userKey);
    return this.authApi.login(user.username, user.password);
  }

  attemptLoginAs(userKey: DeterministicUserKey): Cypress.Chainable<Cypress.Response<unknown>> {
    const user = UserFactory.deterministic(userKey);
    return this.authApi.attemptLogin(user.username, user.password);
  }

  // Two-phase visit: the app wipes the auth token on any boot where
  // localStorage's omnipizza-release key doesn't match the current build
  // hash, and testIsolation clears localStorage between tests - so a
  // single visit-with-onBeforeLoad always loses that race. Visiting once
  // first lets the app stamp omnipizza-release for real; only then does
  // setting the token before a second visit survive the boot sequence.
  hydrateSessionAndOpenCatalog(accessToken: string): void {
    cy.visit('/');
    cy.window().then((win) => win.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken));
    cy.visit('/catalog');
  }

  // Real UI login with a market pre-selected on the login screen - required
  // whenever a scenario needs the app's omnipizza-country Zustand-persist
  // state (tax rate, delivery fee, required checkout field) to be correct
  // for a non-default market. Confirmed live (2026-08-19): writing
  // localStorage's plain "countryCode" key and reloading does NOT update
  // that blob - only selecting a market button on the login screen before
  // authenticating does. loginAs()'s API-only login cannot substitute for
  // this; it never touches the browser at all.
  loginViaUiWithMarket(userKey: DeterministicUserKey, countryCode: CountryCode): void {
    const user = UserFactory.deterministic(userKey);
    cy.visit('/');
    const marketSelector = this.locators.get('login.marketButton').replace('{countryCode}', countryCode);
    cy.get(marketSelector).click();
    const quickLoginSelector = this.locators.get('login.quickLoginButton').replace('{username}', user.username);
    cy.get(quickLoginSelector).click();
    cy.get(this.locators.get('login.submitButton')).click();
  }

  submitLoginFormAs(userKey: DeterministicUserKey): void {
    const user = UserFactory.deterministic(userKey);
    fillField(this.locators.get('login.usernameInput'), user.username);
    fillField(this.locators.get('login.passwordInput'), user.password);
    cy.get(this.locators.get('login.submitButton')).click();
  }

  // The locked-out scenario's API-side claim. Lives here rather than inline
  // in the step definition for the same reason as every other assert*
  // method: claims are countable only if they all have names.
  assertLoginRejectedAsLockedOut(response: Cypress.Response<unknown>): void {
    expect(response.status).to.equal(403);
  }

  // Asserts on the route, not just the generic authenticated-shell marker:
  // landing.readyMarker (the logout button) proves "we're logged in
  // somewhere," not "we landed on /catalog specifically" - if the app's
  // auth guard ever bounced /catalog to some other authenticated route,
  // checking the marker alone would pass green while proving nothing about
  // the catalog page itself.
  assertLandedOnCatalog(): void {
    cy.location('pathname').should('eq', '/catalog');
    cy.get(this.locators.get('landing.readyMarker')).should('be.visible');
  }

  // Asserts on the message text, not just visibility: the harvested
  // selector (login-error) is a generic login-failure element, not
  // locked-out-specific - it likely renders for other failures too (wrong
  // password, etc.), so visibility alone wouldn't prove this scenario
  // specifically hit the locked-out path rather than some other failure.
  // Matched case-insensitively via regex rather than contain.text: this
  // exact copy has not been observed against the real rendered DOM yet
  // (only against the API's JSON error string), so we guard against a
  // plausible casing difference between the API's error text and however
  // the frontend renders it.
  assertLockedOutMessageVisible(): void {
    cy.get(this.locators.get('login.lockedOutError'))
      .should('be.visible')
      .invoke('text')
      .should('match', /locked out/i);
  }
}
