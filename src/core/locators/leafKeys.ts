import type { LocatorTree } from './LocatorProxy';

// Every dot path in a locator tree, in declaration order. Templated
// selectors ({countryCode}, {username}) are skipped: a template is not a
// selector until a facade interpolates it, so neither the harvest nor the
// healer can resolve it.
export function leafKeys(tree: LocatorTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const dotPath = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value !== 'string') return leafKeys(value, dotPath);
    return value.includes('{') ? [] : [dotPath];
  });
}
