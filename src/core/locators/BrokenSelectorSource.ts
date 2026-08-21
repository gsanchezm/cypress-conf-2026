import type { SelectorSource } from './SelectorSource';

// Names itself inside the selector, so Cypress's own failure message reads
// "Expected to find element: [data-cy-broken-locator="checkout.address"],
// but never found it" - unmistakable on a slide, and impossible to confuse
// with a genuine selector regression. The attribute is one no app would
// ever ship, so it cannot accidentally match.
export function brokenSelectorFor(dotPath: string): string {
  return `[data-cy-broken-locator="${dotPath}"]`;
}

// A Decorator over SelectorSource that breaks exactly one key, standing in
// for the everyday event this framework has no other way to rehearse: a
// front-end change renames a data-testid and the locator registry goes
// stale.
//
// Only one key, deliberately: `--expose` separates its own KEY=VALUE pairs
// with commas, so a comma-separated list inside one value would be parsed
// as separate expose entries. One broken selector is also all a demo needs.
export class BrokenSelectorSource implements SelectorSource {
  constructor(
    private readonly inner: SelectorSource,
    private readonly brokenKey: string,
  ) {
    // Resolve once up front purely to validate. A typo'd key would
    // otherwise break nothing, the demo would pass, and the point would be
    // silently lost in front of an audience.
    inner.get(brokenKey);
  }

  get(dotPath: string): string {
    return dotPath === this.brokenKey ? brokenSelectorFor(dotPath) : this.inner.get(dotPath);
  }
}
