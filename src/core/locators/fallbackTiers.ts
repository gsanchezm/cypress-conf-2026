import type { SelectorCandidate } from './SelectorSource';

// The tiers a11y healing falls through when the registry selector matches
// nothing, ordered the way arXiv 2603.20358's ten-level hierarchy orders
// its own: developer-authored, locale-free attributes first (id, name),
// accessibility/semantic attributes next (aria-label, placeholder, title),
// weak structural tiers after (an explicit role, an input type - usually
// ambiguous, and skipped by the exactly-one rule), and visible text last,
// because it is the one most likely to change with copy or locale.
//
// Only tiers cy.get can express are here: everything resolves to a CSS or
// jQuery selector, so the chosen tier is handed to a normal cy.get and keeps
// its retry-ability. Implicit ARIA roles and computed accessible names would
// need the accessibility tree, which nothing in a headless run exposes.
export const FALLBACK_TIERS = ['id', 'name', 'ariaLabel', 'placeholder', 'title', 'role', 'inputType', 'text'] as const;

export type FallbackTier = (typeof FALLBACK_TIERS)[number];

// A list per tier, not a single value: a localized attribute has one value
// per market, and only the rendered market's value can match, so the other
// four cost nothing. That is what lets SA (RTL) heal through exactly the
// same tiers without plumbing a countryCode through the source.
export type FallbackEntry = Partial<Record<FallbackTier, readonly string[]>>;
export type FallbackMap = Record<string, FallbackEntry>;

// CSS.escape is not available under node:test; an attribute selector only
// needs its quote and backslash escaped to be safe for any harvested text.
export function escapeSelectorValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const attribute = (name: string) => (value: string) => `[${name}="${escapeSelectorValue(value)}"]`;

// The innermost element containing the text: a bare :contains also matches
// body and every ancestor, which is never "exactly one".
function innermostContaining(value: string): string {
  const text = escapeSelectorValue(value);
  return `:contains("${text}"):not(:has(:contains("${text}")))`;
}

export const FALLBACK_RESOLVERS: Record<FallbackTier, (value: string) => string> = {
  id: attribute('id'),
  name: attribute('name'),
  ariaLabel: attribute('aria-label'),
  placeholder: attribute('placeholder'),
  title: attribute('title'),
  role: attribute('role'),
  inputType: (value) => `input[type="${escapeSelectorValue(value)}"]`,
  text: innermostContaining,
};

export function isFallbackTier(value: string): value is FallbackTier {
  return (FALLBACK_TIERS as readonly string[]).includes(value);
}

export function fallbackCandidates(entry: FallbackEntry): SelectorCandidate[] {
  return FALLBACK_TIERS.flatMap((tier) =>
    (entry[tier] ?? []).map((value) => ({ tier, selector: FALLBACK_RESOLVERS[tier](value) })),
  );
}
