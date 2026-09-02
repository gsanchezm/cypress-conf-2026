import { chooseCandidate, type CandidateChoice } from '@/core/locators/chooseCandidate';
import type { SelectorCandidate, SelectorSource } from '@/core/locators/SelectorSource';
import { logDetail } from '@/core/logging/stepLog';
import { narrate } from '@/core/logging/demoTrail';
import { precondition } from '@/core/testing/precondition';

export type LocateOptions = Partial<Cypress.Timeoutable>;

const describeCandidate = (candidate: SelectorCandidate): string => `${candidate.tier} ${candidate.selector}`;

function noUniqueCandidate(dotPath: string, candidates: readonly SelectorCandidate[]): string {
  return `locate: none of the ${candidates.length} candidates for "${dotPath}" matched exactly one element: ${candidates
    .map(describeCandidate)
    .join(' | ')}`;
}

function narrateChoice(dotPath: string, candidates: readonly SelectorCandidate[], choice: CandidateChoice): void {
  if (choice.index === 0) {
    logDetail(`[locate] ${dotPath}: ${describeCandidate(choice.candidate)}`);
    return;
  }
  const skipped = candidates.slice(0, choice.index).map(describeCandidate).join(', ');
  narrate(`[heal] ${dotPath}: ${skipped} matched no single element; healed via ${describeCandidate(choice.candidate)}`);
}

// The one Cypress-side primitive healing needs. With a single candidate -
// which is every key when no healer is wired - this IS cy.get(selector,
// options), same command, same selector, same options, so the deterministic
// path is unchanged at the command level. With more, the choice is made
// inside a .should() guard, which retries with Cypress's own loop (a form
// that renders 2-3 s late still resolves), and the chosen selector is then
// handed to a normal cy.get, so .type()/.click()/.should() keep their
// retry-ability. Cypress.$ is the same jQuery engine cy.get selects with, so
// a tier that counts as one here is the one cy.get will find.
export function locate(
  source: SelectorSource,
  dotPath: string,
  options: LocateOptions = {},
): Cypress.Chainable<JQuery<HTMLElement>> {
  const candidates = source.candidates(dotPath);
  precondition(candidates.length > 0, `the selector source offers at least one candidate for "${dotPath}"`);
  if (candidates.length === 1) return cy.get(candidates[0].selector, options);

  const countIn = (doc: Document) => (selector: string) => Cypress.$(selector, doc).length;
  return cy
    .document(options)
    .should((doc) => {
      if (chooseCandidate(candidates, countIn(doc)) === undefined) throw new Error(noUniqueCandidate(dotPath, candidates));
    })
    .then((doc) => {
      const choice = chooseCandidate(candidates, countIn(doc));
      precondition(choice !== undefined, `the guard above left a unique candidate for "${dotPath}"`);
      narrateChoice(dotPath, candidates, choice);
      return cy.get(choice.candidate.selector, options);
    });
}
