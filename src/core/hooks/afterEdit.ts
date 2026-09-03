export interface AfterEditPlan {
  typecheck: boolean;
  nodeTestFiles: string[];
}

export interface CheckResult {
  label: string;
  ok: boolean;
  output: string;
}

// Tail of a failing output that can reach the transcript; anything longer
// would flood the agent's context after every edit.
const MAX_CONTEXT_CHARS = 4000;
// Everything tsconfig.json includes: src, cypress, scripts (ts + json via
// resolveJsonModule) and cypress.config.ts.
const TYPECHECKED = /^(src|cypress|scripts)\/.+\.(ts|json)$|^cypress\.config\.ts$/;
const NODE_TEST = /\.node\.test\.ts$/;
const SOURCE_TS = /^src\/.+\.ts$/;

const toPosix = (path: string): string => path.replace(/\\/g, '/');
const siblingTest = (path: string): string => path.replace(/\.ts$/, '.node.test.ts');

function testsFor(path: string): string[] {
  if (NODE_TEST.test(path)) return [path];
  if (!SOURCE_TS.test(path)) return [];
  return [siblingTest(path)];
}

// Decides what a PostToolUse hook should run for the files an edit touched:
// typecheck for anything TypeScript sees, and the sibling *.node.test.ts when
// one exists. Never a Cypress run - far too slow for a hook.
export function planAfterEditChecks(relativePaths: string[], fileExists: (path: string) => boolean): AfterEditPlan {
  const posix = relativePaths.map(toPosix);
  const nodeTestFiles = [...new Set(posix.flatMap(testsFor))].filter(fileExists);
  return { typecheck: posix.some((path) => TYPECHECKED.test(path)), nodeTestFiles };
}

function describe(result: CheckResult): string {
  if (result.ok) return `${result.label} OK`;
  return `${result.label} FAILED\n${result.output.trim().slice(-MAX_CONTEXT_CHARS)}`;
}

export function formatAfterEditContext(results: CheckResult[]): string {
  return `after-edit: ${results.map(describe).join('; ')}`;
}
