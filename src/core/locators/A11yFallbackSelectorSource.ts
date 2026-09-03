import type { SelectorCandidate, SelectorSource } from './SelectorSource';
import { FALLBACK_TIERS, fallbackCandidates, isFallbackTier, type FallbackEntry, type FallbackMap } from './fallbackTiers';

function unknownTiers(entry: FallbackEntry): string[] {
  return Object.keys(entry).filter((tier) => !isFallbackTier(tier));
}

// The third SelectorSource decorator, same shape as BrokenSelectorSource:
// wraps any source and, for keys the harvested map covers, appends the
// accessibility-inspired fallback tiers after the inner candidates. It never
// changes what the primary selector IS - get() delegates - so a run with the
// healer wired and nothing broken still resolves every key through the
// registry. Wired by cypress/support/e2e.ts under HEAL_LOCATORS=a11y, on the
// outside of BrokenSelectorSource, so a broken selector is the first
// candidate and gets skipped rather than replaced.
export class A11yFallbackSelectorSource implements SelectorSource {
  constructor(
    private readonly inner: SelectorSource,
    private readonly fallbacks: FallbackMap,
  ) {
    // Validate up front, like BrokenSelectorSource: a map key no slice
    // registers is a stale harvest, and a typo'd tier would heal nothing
    // while looking configured.
    Object.entries(fallbacks).forEach(([dotPath, entry]) => {
      inner.get(dotPath);
      const unknown = unknownTiers(entry);
      if (unknown.length === 0) return;
      throw new Error(
        `A11yFallbackSelectorSource: unknown tier(s) ${unknown.join(', ')} under "${dotPath}". Valid tiers: ${FALLBACK_TIERS.join(', ')}`,
      );
    });
  }

  get(dotPath: string): string {
    return this.inner.get(dotPath);
  }

  candidates(dotPath: string): readonly SelectorCandidate[] {
    return [...this.inner.candidates(dotPath), ...fallbackCandidates(this.fallbacks[dotPath] ?? {})];
  }
}
