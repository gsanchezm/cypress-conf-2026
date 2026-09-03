import type { TestResult } from './Observer';
import { causeOf } from './classifyFailure';
import { describeLabels, strategyOf } from './runLabels';

export interface Totals {
  tests: number;
  passed: number;
  failed: number;
  other: number;
  durationMs: number;
}

const EMPTY: Totals = { tests: 0, passed: 0, failed: 0, other: 0, durationMs: 0 };

// A Gherkin title can legally contain "|"; unescaped it would split the row.
export function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function totalsOf(results: TestResult[]): Totals {
  return results.reduce(
    (totals, result) => ({
      tests: totals.tests + 1,
      passed: totals.passed + (result.state === 'passed' ? 1 : 0),
      failed: totals.failed + (result.state === 'failed' ? 1 : 0),
      other: totals.other + (result.state === 'passed' || result.state === 'failed' ? 0 : 1),
      durationMs: totals.durationMs + result.durationMs,
    }),
    EMPTY,
  );
}

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

function row(result: TestResult): string {
  const cells = [
    result.slice,
    strategyOf(result),
    escapeCell(result.title),
    result.state,
    String(result.attempts ?? 1),
    `${result.durationMs}ms`,
    causeOf(result) ?? '–',
  ];
  return `| ${cells.join(' | ')} |`;
}

// One block per spec: heading with the run labels, a totals sentence, then
// the rows. Rendered from data only, so the observer is a two-line append.
export function renderSpecSummary(results: TestResult[]): string {
  const [first] = results;
  if (!first) return '';
  const totals = totalsOf(results);
  return [
    `### ${first.slice} — ${describeLabels(first.labels)}`,
    `**${totals.tests} tests · ${totals.passed} passed · ${totals.failed} failed · ${totals.other} other · ${seconds(totals.durationMs)}**`,
    '',
    '| Slice | Strategy | Test | State | Attempts | Duration | Cause |',
    '|---|---|---|---|---|---|---|',
    ...results.map(row),
  ].join('\n');
}

// One row per strategy seen so far. A CI job runs one strategy, so this is
// a one-row table until the owner triggers the cy.prompt workflow; the deck
// compares the two job summaries side by side.
export function renderStrategyComparison(results: TestResult[]): string {
  const strategies = [...new Set(results.map(strategyOf))];
  const rows = strategies.map((strategy) => {
    const totals = totalsOf(results.filter((result) => strategyOf(result) === strategy));
    return `| ${strategy} | ${totals.tests} | ${totals.passed} | ${totals.failed} | ${seconds(totals.durationMs / totals.tests)} |`;
  });
  return [
    '#### By strategy (cumulative for this job)',
    '| Strategy | Tests | Passed | Failed | Mean duration |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}
