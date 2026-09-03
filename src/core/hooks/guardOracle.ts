import type { EditIntent } from './editIntents';

export type GuardDecision = { allow: true } | { allow: false; reason: string };

export interface OracleGuardOptions {
  projectDir: string;
  allowTestEdits: boolean;
}

// The oracle: Gherkin is the contract the agent exercises, never edits.
const FEATURE_FILE = /^cypress\/e2e\/.+\.feature$/;
// Where claims live (README, "The assertion budget"): every claim is an
// assert* method on a facade or strategy. Nothing else is guarded, so
// fillField's guard .should() in src/core and expect() in a step file are
// free to change.
const CLAIM_HOME = /^src\/features\/[^/]+\/(facade|strategies)\/[^/]+\.ts$/;
const CLAIM_SYNTAX = /\bassert[A-Z]\w*\s*\(|\.should\(|\bexpect\(/;

const toPosix = (path: string): string => path.replace(/\\/g, '/');

// Makes an absolute path project-relative (POSIX separators, case-insensitive
// prefix match because Windows paths arrive in whichever case the tool used).
// A path outside the project, or already relative, comes back as-is minus a
// leading "./".
export function toProjectRelative(filePath: string, projectDir: string): string {
  const file = toPosix(filePath);
  const root = toPosix(projectDir).replace(/\/+$/, '');
  if (!file.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return file.replace(/^\.\//, '');
  return file.slice(root.length + 1);
}

function denyFeature(path: string): GuardDecision {
  return {
    allow: false,
    reason:
      `${path} is the oracle: cypress/e2e/**/*.feature describes the behaviour under test and is not the agent's to change. ` +
      'Fix the step definition, strategy or locator JSON instead. A human changing the contract re-runs with ALLOW_TEST_EDITS=1.',
  };
}

function denyClaim(path: string): GuardDecision {
  return {
    allow: false,
    reason:
      `${path} holds claims (assert* methods on a facade/strategy) and this edit touches an assert* method, a .should( or an expect( call. ` +
      "The assertion budget (one API claim, one UI claim per scenario) is not the agent's to relax. Change how the scenario is exercised " +
      '(steps, strategies, locators, guards) instead, or re-run with ALLOW_TEST_EDITS=1 when a human is changing a claim.',
  };
}

function decideOne(intent: EditIntent, projectDir: string): GuardDecision {
  const path = toProjectRelative(intent.filePath, projectDir);
  if (FEATURE_FILE.test(path)) return denyFeature(path);
  if (!CLAIM_HOME.test(path)) return { allow: true };
  if (!CLAIM_SYNTAX.test(`${intent.before}\n${intent.after}`)) return { allow: true };
  return denyClaim(path);
}

export function decideOracleGuard(intents: EditIntent[], options: OracleGuardOptions): GuardDecision {
  if (options.allowTestEdits) return { allow: true };
  const denied = intents.map((intent) => decideOne(intent, options.projectDir)).find((decision) => !decision.allow);
  return denied ?? { allow: true };
}
