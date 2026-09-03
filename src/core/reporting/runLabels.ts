import { RUN_LABEL_KEYS, type RunLabels, type TestResult } from './Observer';

export const DEFAULT_UI_STRATEGY = 'deterministic';

function asLabel(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

// config.expose is whatever `expose: {}` in cypress.config.ts plus every
// `--expose K=V` pair resolved to; only the three run labels are kept, and
// UI_STRATEGY is always present so every row has a strategy to group by.
export function readRunLabels(expose: Record<string, unknown> | undefined): RunLabels {
  const picked = Object.fromEntries(
    RUN_LABEL_KEYS.flatMap((key) => {
      const value = asLabel(expose?.[key]);
      return value === undefined ? [] : [[key, value] as const];
    }),
  ) as RunLabels;
  return { UI_STRATEGY: DEFAULT_UI_STRATEGY, ...picked };
}

export function strategyOf(result: Pick<TestResult, 'labels'>): string {
  return result.labels?.UI_STRATEGY ?? DEFAULT_UI_STRATEGY;
}

export function describeLabels(labels: RunLabels | undefined): string {
  const strategy = labels?.UI_STRATEGY ?? DEFAULT_UI_STRATEGY;
  const extras = RUN_LABEL_KEYS.filter((key) => key !== 'UI_STRATEGY').flatMap((key) => {
    const value = labels?.[key];
    return value === undefined ? [] : [`${key}=${value}`];
  });
  return [strategy, ...extras].join(', ');
}
