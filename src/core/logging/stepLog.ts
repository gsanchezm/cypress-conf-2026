import { shouldLog } from './logLevel';

// Writes through cy.log, not a browser logger. Browser-side pino was
// considered and rejected: it writes to the browser console, which in
// Cypress is strictly less visible than the command log - cy.log entries
// appear in the runner, in Test Replay, and in the mochawesome report,
// where a console line appears in none of them.
//
// Scope note: this level is deliberately separate from ConsoleObserver's
// pino level. That one runs in Cypress's Node process and reports spec
// results to CI; this one runs in the browser and narrates steps inside a
// test. They answer different questions for different readers, so one knob
// controlling both would be a false economy.
//
// Set with `--expose LOG_LEVEL=debug` (or an `expose` entry in
// cypress.config.ts). Unset behaves as `info`; an unrecognised value
// throws rather than quietly reverting - see resolveLogLevel.
function configuredLevel(): string | undefined {
  return Cypress.expose('LOG_LEVEL') as string | undefined;
}

// The narration a passing run should carry: which slice, which phase.
export function logStep(message: string): void {
  if (!shouldLog(configuredLevel(), 'info')) return;
  cy.log(message);
}

// Detail worth having only when a run is being investigated - resolved
// selectors, seeded payloads, per-market values.
export function logDetail(message: string): void {
  if (!shouldLog(configuredLevel(), 'debug')) return;
  cy.log(message);
}
