import type { SelectorCandidate } from './SelectorSource';

export interface CandidateChoice {
  readonly candidate: SelectorCandidate;
  readonly index: number;
}

// The rule every healer in this framework obeys: the first tier that matches
// EXACTLY one element wins. Zero means the tier is absent from this DOM (a
// renamed testid, another market's required field). Two or more means it is
// ambiguous, and an ambiguous heal is worse than none - typing the address
// into the wrong input would pass fillField's own value guard and fail three
// commands later as a mystery. Skipping is strictly better.
//
// findIndex evaluates in order and stops at the first hit, so an unbroken
// run counts exactly one selector - the registry's - and never pays for the
// fallbacks.
export function chooseCandidate(
  candidates: readonly SelectorCandidate[],
  countMatches: (selector: string) => number,
): CandidateChoice | undefined {
  const index = candidates.findIndex((candidate) => countMatches(candidate.selector) === 1);
  if (index === -1) return undefined;
  return { candidate: candidates[index], index };
}
