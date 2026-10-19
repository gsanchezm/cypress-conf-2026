// Deterministic pre-classification of a Cypress failure from its text (a CI
// job log, a mochawesome message, a `tap reporter` error). A human or optional
// agent can use the result as a hint and must inspect the supporting evidence.
// The rubric is the one in
// docs/superpowers/specs/2026-09-02-agentic-loop-design.md §6.7.
export type TriageCategory = 'regression' | 'flake' | 'selector_drift' | 'env' | 'cold_start';

export interface TriageSignal {
  category: TriageCategory;
  evidence: string;
}

// Highest precedence first: a broken selector explains every downstream
// assertion; a cold backend explains a missing precondition; a regression is
// what is left when nothing else does.
export const TRIAGE_PRECEDENCE: readonly TriageCategory[] = ['selector_drift', 'cold_start', 'env', 'flake', 'regression'];

const MAX_EVIDENCE_CHARS = 200;

interface TriageRule {
  category: TriageCategory;
  pattern: RegExp;
}

// One rule per category, tried in this order on each line; the first hit
// wins for that line. Precedence across lines is TRIAGE_PRECEDENCE's job.
const RULES: readonly TriageRule[] = [
  {
    category: 'selector_drift',
    pattern: /data-cy-broken-locator|Expected to find element:.*but never found it|LocatorProxy: no selector registered/,
  },
  {
    category: 'cold_start',
    pattern:
      /ETIMEDOUT|ECONNRESET|ECONNREFUSED|socket hang up|\b50[234]\b.*onrender\.com|onrender\.com.*\b50[234]\b|cy\.request\(\).*(timed out|failed trying to load)/,
  },
  {
    category: 'env',
    pattern: /PreconditionError|Precondition not met|BREAK_LOCATOR: no slice registers|Cypress\.expose\(.*\) is undefined/,
  },
  {
    category: 'flake',
    pattern: /\(\d+ retr(y|ies)\)|passed on attempt \d|attempt \d+ .*passed/i,
  },
  { category: 'regression', pattern: /AssertionError/ },
];

function signalsInLine(line: string): TriageSignal[] {
  const trimmed = line.trim();
  const hit = RULES.find((rule) => rule.pattern.test(trimmed));
  if (!hit) return [];
  return [{ category: hit.category, evidence: trimmed.slice(0, MAX_EVIDENCE_CHARS) }];
}

export function classifyFailureSignals(text: string): TriageSignal[] {
  return text.split(/\r?\n/).flatMap(signalsInLine);
}

export function suggestCategory(signals: TriageSignal[]): TriageCategory | null {
  const present = new Set(signals.map((signal) => signal.category));
  return TRIAGE_PRECEDENCE.find((category) => present.has(category)) ?? null;
}
