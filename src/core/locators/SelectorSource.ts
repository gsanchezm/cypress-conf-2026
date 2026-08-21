// Extracted so LocatorProxy is not the only thing that can answer "what is
// the selector for this key?". BrokenSelectorSource is the other
// implementation, and anything that only needs to resolve a key should
// depend on this rather than on the concrete proxy.
export interface SelectorSource {
  get(dotPath: string): string;
}
