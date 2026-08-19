import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { createAuthFacade } from '../../../../cypress/support/e2e';
import { AtomicScenario } from '../../../core/ui/AtomicScenario';
import { AUTH_TOKEN_STORAGE_KEY } from '../../../core/config/storageKeys';
import type { DeterministicUserKey } from '../data/UserFactory';

let userKey: DeterministicUserKey;

Given('a standard customer', () => {
  userKey = 'standard';
});

Given('a locked-out customer', () => {
  userKey = 'lockedOut';
});

// Intentionally empty - see the note above Step 6. Cucumber requires a step
// definition to exist for every line, but the actual work happens as one
// atomic run() call in the corresponding Then step below.
When('they log in', () => {});

When('they attempt to log in', () => {});

Then('they should land on the catalog page as an authenticated customer', () => {
  const facade = createAuthFacade();
  let accessToken: string;

  AtomicScenario.for('auth').run({
    arrangeViaApi: () => {
      facade.loginAs(userKey).then((session) => {
        accessToken = session.accessToken;
      });
    },
    hydrateUi: () => {
      // onBeforeLoad sets the token before the app's own JS boots, so there
      // is no race with a client-side auth-guard redirect: a plain
      // visit-then-set-localStorage-then-reload sequence risks landing on
      // POST_LOGIN_ROUTE as an unauthenticated visitor, getting redirected
      // to the login page, setting the token too late, and reloading the
      // login page instead of the catalog.
      cy.visit('/catalog', {
        onBeforeLoad: (win) => win.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken),
      });
    },
    assertUi: () => {
      facade.assertLandedOnCatalog();
    },
  });
});

Then('they should see a locked-out account message', () => {
  const facade = createAuthFacade();

  AtomicScenario.for('auth').run({
    arrangeViaApi: () => {
      facade.attemptLoginAs(userKey).then((response) => {
        expect(response.status).to.equal(403);
      });
    },
    hydrateUi: () => {
      cy.visit('/');
      facade.submitLoginFormAs(userKey);
    },
    assertUi: () => {
      facade.assertLockedOutMessageVisible();
    },
  });
});
