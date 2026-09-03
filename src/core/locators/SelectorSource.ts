// One selector a SelectorSource is willing to try for a key, labelled with
// the tier it came from so a heal can say which one fired.
export interface SelectorCandidate {
  readonly tier: string;
  readonly selector: string;
}

export const REGISTRY_TIER = 'registry';
export const BROKEN_TIER = 'broken';

// Extracted so LocatorProxy is not the only thing that can answer "what is
// the selector for this key?". BrokenSelectorSource and
// A11yFallbackSelectorSource are the other implementations, and anything
// that only needs to resolve a key should depend on this rather than on the
// concrete proxy.
//
// get() stays synchronous and single-valued on purpose - the README's 2025
// retrospective records what an async selector cost. candidates() is the
// seam healing needs: an ORDERED list, primary first, never empty, that
// locate() (src/core/ui/locate.ts) narrows to one at command run-time,
// which is the only moment "is the primary still in the DOM?" is knowable.
export interface SelectorSource {
  get(dotPath: string): string;
  candidates(dotPath: string): readonly SelectorCandidate[];
}
