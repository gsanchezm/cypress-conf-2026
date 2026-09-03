export interface TestError {
  name: string;
  message: string;
}

// The run configuration a row was produced under. Read once per run from
// config.expose in setupNodeEvents, so a job summary can say "these five
// rows ran the cyPrompt strategy with checkout.address broken" without
// anyone re-reading the CLI. HEAL_LOCATORS belongs to the self-healing
// branch; it is listed here so its rows label themselves the moment that
// branch merges.
export const RUN_LABEL_KEYS = ['UI_STRATEGY', 'BREAK_LOCATOR', 'HEAL_LOCATORS'] as const;
export type RunLabelKey = (typeof RUN_LABEL_KEYS)[number];
export type RunLabels = Partial<Record<RunLabelKey, string>>;

export interface TestResult {
  specPath: string;
  title: string;
  state: 'passed' | 'failed' | 'pending' | 'skipped';
  durationMs: number;
  slice: string;
  // All optional: rows built by hand (tests, other branches) keep compiling.
  error?: TestError; // only when state === 'failed' and Cypress reported one
  attempts?: number; // absent reads as 1
  screenshots?: string[]; // absolute paths of this test's screenshots
  labels?: RunLabels; // absent UI_STRATEGY reads as 'deterministic'
}

export interface Observer {
  onSpecComplete(results: TestResult[]): void;
}
