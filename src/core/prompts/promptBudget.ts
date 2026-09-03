import type { PromptDocument } from './preparePrompt';

// Verified 2026-09-02 against docs.cypress.io/cloud/faq#cyprompt and
// cypress.io/pricing. Since 2026-08-01 every cy.prompt() command that runs -
// open or run mode, cache hit or not, however many steps it batches - is one
// billed execution; the free Starter plan holds 100 a month (and 500 recorded
// test results). The "100 per hour" figure this repo used to quote is a
// per-user cap that applies only to runs NOT recording to Cloud, so it never
// governs cy-prompt-suite.yml, which records.
export const CY_PROMPT_MAX_STEPS_PER_CALL = 50;
export const STARTER_PLAN_EXECUTIONS_PER_MONTH = 100;
export const STARTER_PLAN_TEST_RESULTS_PER_MONTH = 500;

interface RunShape {
  callsPerScenario: number;
  scenarios: number;
}

interface QuotaShape {
  quota: number;
  executionsPerRun: number;
}

function nonNegative(value: number, name: string): number {
  if (value < 0) throw new Error(`Prompt budget: ${name} must not be negative, got ${value}`);
  return value;
}

// One `## section` in a prompt document is one cy.prompt() call, by the
// batching rule in checkout.prompt.md - so the section count is the per-scenario
// cost, whatever the sections' step counts.
export function promptCallsPerScenario(document: PromptDocument): number {
  return document.size;
}

export function executionsPerRun({ callsPerScenario, scenarios }: RunShape): number {
  return nonNegative(callsPerScenario, 'callsPerScenario') * nonNegative(scenarios, 'scenarios');
}

// Whole runs only: a partial run still bills its executions, so the fraction
// left over is not another rehearsal.
export function runsPerMonth({ quota, executionsPerRun }: QuotaShape): number {
  if (executionsPerRun < 1) {
    throw new Error(`Prompt budget: executionsPerRun must be at least 1, got ${executionsPerRun}`);
  }
  return Math.floor(nonNegative(quota, 'quota') / executionsPerRun);
}
