import { AuthApiClient } from '@/features/auth/api/AuthApiClient';
import { AuthFacade } from '@/features/auth/facade/AuthFacade';
import { LocatorProxy, type LocatorTree } from '@/core/locators/LocatorProxy';
import { BrokenSelectorSource } from '@/core/locators/BrokenSelectorSource';
import { A11yFallbackSelectorSource } from '@/core/locators/A11yFallbackSelectorSource';
import type { FallbackMap } from '@/core/locators/fallbackTiers';
import type { SelectorSource } from '@/core/locators/SelectorSource';
import authLocators from '@/features/auth/locators/auth.locators.json';
import authFallbacks from '@/features/auth/locators/auth.fallbacks.json';
import { CatalogApiClient } from '@/features/catalog/api/CatalogApiClient';
import { CatalogFacade } from '@/features/catalog/facade/CatalogFacade';
import catalogLocators from '@/features/catalog/locators/catalog.locators.json';
import catalogFallbacks from '@/features/catalog/locators/catalog.fallbacks.json';
import { CheckoutApiClient } from '@/features/checkout/api/CheckoutApiClient';
import { CheckoutFacade } from '@/features/checkout/facade/CheckoutFacade';
import { DeterministicCheckoutUiStrategy } from '@/features/checkout/strategies/DeterministicCheckoutUiStrategy';
import { CyPromptCheckoutUiStrategy } from '@/features/checkout/strategies/CyPromptCheckoutUiStrategy';
import checkoutLocators from '@/features/checkout/locators/checkout.locators.json';
import checkoutFallbacks from '@/features/checkout/locators/checkout.fallbacks.json';

// The single place a SelectorSource is chosen, which is what makes every
// locator demo a wiring decision rather than a code change:
//   --expose BREAK_LOCATOR=checkout.address   one registry key resolves to a selector nothing ships
//   --expose MUTATE_DOM=checkout.address      the registry is untouched; the app's real data-testid is renamed after render
//   --expose HEAL_LOCATORS=a11y               A11yFallbackSelectorSource wraps the source with the harvested fallback map
// See the README's demo section.
const ALL_LOCATOR_TREES: LocatorTree[] = [authLocators, catalogLocators, checkoutLocators];

type DemoKeyFlag = 'BREAK_LOCATOR' | 'MUTATE_DOM';

function registers(tree: LocatorTree, key: string): boolean {
  try {
    new LocatorProxy(tree).get(key);
    return true;
  } catch {
    return false;
  }
}

// Checked against every slice, not just this one. Only the owning slice
// acts on the key, but a key NO slice registers is a typo, and the demo has
// to say so rather than run green while breaking nothing.
function demoKey(flag: DemoKeyFlag): string | undefined {
  const key = Cypress.expose(flag) as string | undefined;
  if (key === undefined) return undefined;
  if (ALL_LOCATOR_TREES.some((candidate) => registers(candidate, key))) return key;
  throw new Error(`${flag}: no slice registers a selector for the key "${key}"`);
}

function healed(source: SelectorSource, fallbacks: FallbackMap): SelectorSource {
  const healer = Cypress.expose('HEAL_LOCATORS') as string | undefined;
  if (healer === undefined) return source;
  if (healer === 'a11y') return new A11yFallbackSelectorSource(source, fallbacks);
  throw new Error(`HEAL_LOCATORS: unknown healer "${healer}". Valid healers: a11y`);
}

function selectorsFor(tree: LocatorTree, fallbacks: FallbackMap): SelectorSource {
  const real = new LocatorProxy(tree);
  const brokenKey = demoKey('BREAK_LOCATOR');
  const mutatedKey = demoKey('MUTATE_DOM');
  if (brokenKey !== undefined && mutatedKey !== undefined) {
    throw new Error('BREAK_LOCATOR and MUTATE_DOM are two versions of the same demo - pass one');
  }
  // Healer outermost: a broken selector stays the FIRST candidate, matches
  // nothing, and is skipped - the demo's fourth row.
  const broken = brokenKey !== undefined && registers(tree, brokenKey) ? new BrokenSelectorSource(real, brokenKey) : real;
  return healed(broken, fallbacks);
}

export function createAuthFacade(): AuthFacade {
  return new AuthFacade(new AuthApiClient(), selectorsFor(authLocators, authFallbacks));
}

export function createCatalogFacade(): CatalogFacade {
  return new CatalogFacade(new CatalogApiClient(), selectorsFor(catalogLocators, catalogFallbacks));
}

export function createCheckoutFacade(): CheckoutFacade {
  const checkoutApi = new CheckoutApiClient();
  const uiStrategy =
    Cypress.expose('UI_STRATEGY') === 'cyPrompt'
      ? new CyPromptCheckoutUiStrategy()
      : new DeterministicCheckoutUiStrategy(selectorsFor(checkoutLocators, checkoutFallbacks), checkoutApi);
  return new CheckoutFacade(checkoutApi, uiStrategy);
}
