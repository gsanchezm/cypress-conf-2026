import { FALLBACK_TIERS, type FallbackEntry, type FallbackMap, type FallbackTier } from './fallbackTiers';

// The slice of Element the harvest reads, kept structural so node:test can
// feed it a plain object.
export interface HarvestableElement {
  readonly tagName: string;
  readonly textContent: string | null;
  getAttribute(name: string): string | null;
}

export type HarvestedAttributes = Partial<Record<FallbackTier, string>>;

const TEXT_MAX_LENGTH = 60;
const TEXTLESS_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function visibleText(element: HarvestableElement): string | undefined {
  if (TEXTLESS_TAGS.has(element.tagName.toUpperCase())) return undefined;
  const text = (element.textContent ?? '').trim();
  if (text.length === 0 || text.length > TEXT_MAX_LENGTH) return undefined;
  return text;
}

function inputType(element: HarvestableElement): string | undefined {
  if (element.tagName.toUpperCase() !== 'INPUT') return undefined;
  return element.getAttribute('type') ?? 'text';
}

// Values are recorded verbatim - Arabic text, RTL marks and all - because a
// selector has to match what the DOM holds, exactly as the catalog slice's
// expected price strings do.
export function harvestAttributes(element: HarvestableElement): HarvestedAttributes {
  const raw: Record<FallbackTier, string | null | undefined> = {
    id: element.getAttribute('id'),
    name: element.getAttribute('name'),
    ariaLabel: element.getAttribute('aria-label'),
    placeholder: element.getAttribute('placeholder'),
    title: element.getAttribute('title'),
    role: element.getAttribute('role'),
    inputType: inputType(element),
    text: visibleText(element),
  };
  const present = FALLBACK_TIERS.flatMap((tier): [FallbackTier, string][] => {
    const value = raw[tier];
    return value ? [[tier, value]] : [];
  });
  return Object.fromEntries(present) as HarvestedAttributes;
}

// Append-and-dedupe per tier, so five markets fold into one entry whose
// localized tiers carry one value per market and whose stable tiers carry
// one value total. Tier order is FALLBACK_TIERS order, so the JSON diff is
// stable across harvests.
export function mergeHarvest(map: FallbackMap, dotPath: string, attributes: HarvestedAttributes): FallbackMap {
  const existing: FallbackEntry = map[dotPath] ?? {};
  const merged = FALLBACK_TIERS.flatMap((tier): [FallbackTier, readonly string[]][] => {
    const value = attributes[tier];
    const values = [...new Set([...(existing[tier] ?? []), ...(value === undefined ? [] : [value])])];
    return values.length === 0 ? [] : [[tier, values]];
  });
  return { ...map, [dotPath]: Object.fromEntries(merged) as FallbackEntry };
}
