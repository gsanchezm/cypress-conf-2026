import type { SelectorSource } from '@/core/locators/SelectorSource';
import { belongsToScreen, renamedTestId } from '@/core/locators/mutation';
import { narrate } from '@/core/logging/demoTrail';
import { precondition } from '@/core/testing/precondition';

function renameTestId(element: HTMLElement): string {
  const previous = element.getAttribute('data-testid');
  precondition(previous !== null, 'the element chosen for MUTATE_DOM carries a data-testid to rename');
  element.setAttribute('data-testid', renamedTestId(previous));
  return previous;
}

// "Break the app, not the JSON." The registry stays exactly as committed;
// after the screen under test has rendered, the REAL data-testid on the
// element the key points at is renamed. The deterministic path then fails
// because the DOM changed - which is the claim the slide makes - and a
// healer has to find the element by what it still is (id, aria-label,
// placeholder, ...).
//
// Unset, this enqueues nothing, so the deterministic path is unchanged. The
// element is found through source.get(), the PRIMARY selector, which is why
// this composes with HEAL_LOCATORS (the healer's get() still returns the
// registry selector) and why it cannot combine with BREAK_LOCATOR (the
// composition root refuses both at once).
//
// Call it after the screen's ready guard and before the first interaction
// with that screen's keys - cy.get() below still retries, but a screen that
// has not rendered would time out here rather than at the demo's real
// failure point.
export function mutateDomIfRequested(source: SelectorSource, screen: string): void {
  const dotPath = Cypress.expose('MUTATE_DOM') as string | undefined;
  if (dotPath === undefined) return;
  if (!belongsToScreen(dotPath, screen)) return;

  const primary = source.get(dotPath);
  cy.get(primary).then(($elements) => {
    const previous = $elements.toArray().map(renameTestId);
    narrate(
      `[mutate-dom] ${dotPath}: renamed data-testid "${previous[0]}" -> "${renamedTestId(previous[0])}" on ${previous.length} element(s); the registry still says ${primary}`,
    );
  });
}
