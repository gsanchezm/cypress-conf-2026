import { basename } from 'node:path';
import type { RunLabels, TestError, TestResult } from './Observer';

// Structural view of what Cypress hands to after:spec. Only the fields the
// mapper reads are declared, so tests can build literals without satisfying
// CypressCommandLine.RunResult.
//
// Shape confirmed against a real payload dumped on 2026-09-02 through
// AFTER_SPEC_DUMP (docs/superpowers/reports/2026-09-02-after-spec-dump.jsonl;
// auth slice, --expose BREAK_LOCATOR=login.usernameInput, Cypress 15.21.0,
// Chrome 152 headless, Windows, retries runMode 2). What was seen:
// - results keys: error, reporter, reporterStats, screenshots, spec, stats,
//   tests, video. Each test carries exactly attempts, displayError, duration,
//   state, title.
// - attempts carry only `state`: [{state:'failed'} x3] for the failed test,
//   [{state:'passed'}] for the passed one. The error text lives only in
//   `displayError`, which on a passed test was '' in the mixed spec and
//   null in the all-green spec (both seen, both handled below).
// - displayError starts 'AssertionError: Timed out retrying after 4000ms:
//   Expected to find element: `[data-cy-broken-locator="login.usernameInput"]`,
//   but never found it.' followed by ONE newline and the first indented
//   '    at fillField (...)' frame - hence STACK_FRAME below.
// - screenshots are a spec-level list of {height, name: null, path, takenAt,
//   width}, linked to a test by file name only. basename(path) is
//   '<title.join(" -- ")> (failed).png', then '... (failed) (attempt 2).png'
//   and '... (failed) (attempt 3).png'. Paths are absolute and
//   backslash-separated on Windows; node:path.basename copes with both.
// - spec.relative is 'cypress\e2e\auth\auth.feature' on Windows, hence the
//   separator-agnostic SLICE regex.
// - config.expose in setupNodeEvents was {apiUrl, BREAK_LOCATOR:
//   'login.usernameInput'}: the CLI pair is merged into config.expose, so
//   readRunLabels(config.expose) needs no config.resolved fallback.
// - Only the locked-out scenario failed (3 attempts, 3 screenshots). The
//   standard-customer scenario logs in through the API and hydrates the
//   session without typing into the form, so a broken login.usernameInput
//   never reaches it; its passed row (attempts 1, screenshots [], no error)
//   sits in the same payload and is evidence for the happy path too.
export interface AfterSpecTest {
  title: string[];
  state: string;
  duration?: number | null;
  displayError?: string | null;
  attempts?: { state: string }[] | null;
}

export interface AfterSpecScreenshot {
  path: string;
}

export interface AfterSpecPayload {
  tests?: AfterSpecTest[] | null;
  screenshots?: AfterSpecScreenshot[] | null;
}

const SLICE = /[\\/]e2e[\\/]([^\\/]+)[\\/]/;
const STACK_FRAME = /\n\s+at\s/;
const NAMED_ERROR = /^([A-Za-z_$][\w$]*):\s*([\s\S]*)$/;
const STATES: ReadonlySet<string> = new Set(['passed', 'failed', 'pending', 'skipped']);

export function sliceOf(specRelative: string): string {
  return SLICE.exec(specRelative)?.[1] ?? 'unknown';
}

// displayError is the console rendering: "Name: message\n\n    at frame".
// Everything from the first stack frame on is dropped; the name is what
// classifyFailure keys on (PreconditionError, AssertionError, ...).
export function parseDisplayError(displayError: string | null | undefined): TestError | undefined {
  const text = (displayError ?? '').split(STACK_FRAME)[0]!.trim();
  if (text.length === 0) return undefined;
  const named = NAMED_ERROR.exec(text);
  if (!named) return { name: 'Error', message: text };
  return { name: named[1]!, message: named[2]!.trim() };
}

// Cypress names a failure screenshot "<titles joined by ' -- '> (failed).png"
// and appends " (attempt N)" on retries. Matching on the prefix keeps both
// and never hands one test another test's image; an unmatched file is
// dropped rather than guessed.
export function screenshotsFor(titleParts: string[], screenshots: AfterSpecScreenshot[]): string[] {
  const prefix = titleParts.join(' -- ');
  return screenshots.map((shot) => shot.path).filter((path) => basename(path).startsWith(prefix));
}

function toState(state: string): TestResult['state'] {
  return STATES.has(state) ? (state as TestResult['state']) : 'skipped';
}

export function toTestResults(specRelative: string, payload: AfterSpecPayload | undefined, labels: RunLabels): TestResult[] {
  const slice = sliceOf(specRelative);
  const screenshots = payload?.screenshots ?? [];
  return (payload?.tests ?? []).map((test) => {
    const state = toState(test.state);
    return {
      specPath: specRelative,
      title: test.title.join(' > '),
      state,
      durationMs: test.duration ?? 0,
      slice,
      attempts: test.attempts?.length ?? 1,
      screenshots: screenshotsFor(test.title, screenshots),
      labels,
      ...(state === 'failed' ? { error: parseDisplayError(test.displayError) } : {}),
    };
  });
}
