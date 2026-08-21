import { AuthApiClient } from '@/features/auth/api/AuthApiClient';
import { AuthFacade } from '@/features/auth/facade/AuthFacade';
import { LocatorProxy, type LocatorTree } from '@/core/locators/LocatorProxy';
import { BrokenSelectorSource } from '@/core/locators/BrokenSelectorSource';
import type { SelectorSource } from '@/core/locators/SelectorSource';
import authLocators from '@/features/auth/locators/auth.locators.json';
import { CatalogApiClient } from '@/features/catalog/api/CatalogApiClient';
import { CatalogFacade } from '@/features/catalog/facade/CatalogFacade';
import catalogLocators from '@/features/catalog/locators/catalog.locators.json';
import { CheckoutApiClient } from '@/features/checkout/api/CheckoutApiClient';
import { CheckoutFacade } from '@/features/checkout/facade/CheckoutFacade';
import { DeterministicCheckoutUiStrategy } from '@/features/checkout/strategies/DeterministicCheckoutUiStrategy';
import { CyPromptCheckoutUiStrategy } from '@/features/checkout/strategies/CyPromptCheckoutUiStrategy';
import checkoutLocators from '@/features/checkout/locators/checkout.locators.json';

// The single place a SelectorSource is chosen, which is what makes the
// broken-locator demo a wiring decision rather than a code change: pass
// `--expose BREAK_LOCATOR=checkout.address` and one key starts resolving to
// a selector that matches nothing. See the README's demo section - and its
// caveat about what the demo does and does not prove.
const ALL_LOCATOR_TREES: LocatorTree[] = [authLocators, catalogLocators, checkoutLocators];

function registers(tree: LocatorTree, key: string): boolean {
  try {
    new LocatorProxy(tree).get(key);
    return true;
  } catch {
    return false;
  }
}

function selectorsFor(tree: LocatorTree): SelectorSource {
  const real = new LocatorProxy(tree);
  const brokenKey = Cypress.expose('BREAK_LOCATOR') as string | undefined;
  if (!brokenKey) return real;

  // Checked against every slice, not just this one. Only the owning slice
  // gets decorated - handing the key to a tree that has never heard of it
  // would throw in BrokenSelectorSource's constructor - but a key NO slice
  // registers is a typo, and the demo has to say so rather than run green
  // while breaking nothing.
  if (!ALL_LOCATOR_TREES.some((candidate) => registers(candidate, brokenKey))) {
    throw new Error(`BREAK_LOCATOR: no slice registers a selector for the key "${brokenKey}"`);
  }

  return registers(tree, brokenKey) ? new BrokenSelectorSource(real, brokenKey) : real;
}

export function createAuthFacade(): AuthFacade {
  return new AuthFacade(new AuthApiClient(), selectorsFor(authLocators));
}

export function createCatalogFacade(): CatalogFacade {
  return new CatalogFacade(new CatalogApiClient(), selectorsFor(catalogLocators));
}

export function createCheckoutFacade(): CheckoutFacade {
  const checkoutApi = new CheckoutApiClient();
  const uiStrategy =
    Cypress.expose('UI_STRATEGY') === 'cyPrompt'
      ? new CyPromptCheckoutUiStrategy()
      : new DeterministicCheckoutUiStrategy(selectorsFor(checkoutLocators), checkoutApi);
  return new CheckoutFacade(checkoutApi, uiStrategy);
}
