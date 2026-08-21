import type { SelectorSource } from './SelectorSource';

export type LocatorTree = { [key: string]: string | LocatorTree };

export class LocatorProxy implements SelectorSource {
  private readonly cache = new Map<string, string>();

  constructor(private readonly tree: LocatorTree) {}

  get(dotPath: string): string {
    const cached = this.cache.get(dotPath);
    if (cached !== undefined) return cached;

    const value = dotPath
      .split('.')
      .reduce<string | LocatorTree | undefined>(
        (node, key) => (typeof node === 'object' && node !== null ? node[key] : undefined),
        this.tree,
      );

    if (typeof value !== 'string') {
      throw new Error(`LocatorProxy: no selector registered for key "${dotPath}"`);
    }

    this.cache.set(dotPath, value);
    return value;
  }
}
