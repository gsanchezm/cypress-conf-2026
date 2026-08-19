import { Before, Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { createAuthFacade } from '../../../../cypress/support/e2e';
import { AtomicScenario } from '../../../core/ui/AtomicScenario';
import type { DeterministicUserKey } from '../data/UserFactory';

let userKey: DeterministicUserKey | undefined;

function requireUserKey(): DeterministicUserKey {
  if (!userKey) {
    throw new Error('No customer selected - a Given step must run before this step');
  }
  return userKey;
}

Before(() => {
  userKey = undefined;
});

Given('a standard customer', () => {
  userKey = 'standard';
});

Given('a locked-out customer', () => {
  userKey = 'lockedOut';
});

// Intentionally empty. AtomicScenario's whole thesis is that arrange,
// hydrate, and assert fire together as one atomic unit - splitting the
// assertion into a separate Then step outside AtomicScenario.run() would
// defeat that. Given/When only record intent (which customer, which
// action); the full atomic run happens in the Then step below.
When('they log in', () => {});

When('they attempt to log in', () => {});

Then('they should land on the catalog page as an authenticated customer', () => {
  const facade = createAuthFacade();
  let accessToken: string;

  AtomicScenario.for('auth').run({
    arrangeViaApi: () => {
      facade.loginAs(requireUserKey()).then((session) => {
        accessToken = session.accessToken;
      });
    },
    hydrateUi: () => {
      // Deferred via cy.then(): AtomicScenario.run() invokes arrangeViaApi
      // and hydrateUi synchronously back to back - arrangeViaApi's
      // cy.request().then() has only been queued, not run, by the time this
      // callback executes, so accessToken is still unassigned if read here
      // directly. Wrapping in cy.then() defers the read until this step
      // reaches the front of the command queue, after arrangeViaApi's
      // queued request (and its accessToken assignment) has completed.
      cy.then(() => facade.hydrateSessionAndOpenCatalog(accessToken));
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
      facade.attemptLoginAs(requireUserKey()).then((response) => {
        expect(response.status).to.equal(403);
      });
    },
    hydrateUi: () => {
      cy.visit('/');
      facade.submitLoginFormAs(requireUserKey());
    },
    assertUi: () => {
      facade.assertLockedOutMessageVisible();
    },
  });
});
