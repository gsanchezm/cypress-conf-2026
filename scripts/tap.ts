// Thin I/O shell over src/core/tap. Two modes:
//   pnpm tap <subcommand> [flags]   -> prints exactly what `cypress tap ... --json` printed
//   pnpm tap:run <spec>             -> dispatch + fresh-verdict poll (see freshVerdict.ts)
// Spawns the Cypress CLI script directly under the current Node so the exit
// status is the real one (no pnpm/shell re-mapping) and the Windows libuv
// abort can be recognised and absorbed by parseTapOutput.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { parseTapOutput, type TapOutcome } from '../src/core/tap/parseTapOutput';
import { classifyStatusPoll, type TapStatus } from '../src/core/tap/freshVerdict';

const require = createRequire(import.meta.url);
// `cypress/bin` is the CLI entry the package's `exports` map exposes
// (-> dist/bin/cypress); `cypress/bin/cypress` is NOT exported and throws
// ERR_PACKAGE_PATH_NOT_EXPORTED - verified 2026-09-02 on cypress 15.21.0.
const CYPRESS_CLI = require.resolve('cypress/bin');
const POLL_INTERVAL_MS = 2_000;
const VERDICT_TIMEOUT_MS = 180_000;

function runTap<T = unknown>(args: string[]): TapOutcome<T> {
  const withoutJson = args.filter((arg) => arg !== '--json');
  const child = spawnSync(process.execPath, [CYPRESS_CLI, 'tap', ...withoutJson, '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  return parseTapOutput<T>({ status: child.status, stdout: child.stdout ?? '', stderr: child.stderr ?? '' });
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message: string, extra: Record<string, unknown> = {}): never {
  printJson({ error: message, ...extra });
  process.exit(1);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function status(): TapStatus {
  const outcome = runTap<TapStatus>(['status']);
  if (outcome.kind === 'error') return fail(outcome.message, { status: outcome.status, stderr: outcome.stderr });
  return outcome.data;
}

async function verdict(spec: string | undefined): Promise<void> {
  if (!spec) return fail('usage: pnpm tap:run <project-relative spec path>');
  const baseline = status();
  if (baseline.status === 'not connected') return fail('no cypress open session: start one with `pnpm cy:open` (E2E, Chrome) first');
  const baselineStartedAt = baseline.startedAt ?? null;

  const dispatched = runTap(['run', spec]);
  if (dispatched.kind === 'error') return fail(dispatched.message, { status: dispatched.status, stderr: dispatched.stderr });

  const started = Date.now();
  while (Date.now() - started < VERDICT_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const decision = classifyStatusPoll(baselineStartedAt, status(), spec);
    if (decision.action === 'wait') continue;
    if (decision.action === 'abort') return fail(decision.reason);
    const { status: current } = decision;
    return printJson({
      verdict: decision.verdict,
      spec,
      startedAt: current.startedAt ?? null,
      totalTests: current.totalTests ?? null,
      results: current.results ?? null,
      error: current.error ?? null,
      elapsedMs: Date.now() - started,
    });
  }
  return fail(`no fresh verdict for ${spec} within ${VERDICT_TIMEOUT_MS / 1000}s (a spec that fails to build can stay in "loading" - check the Cypress app)`);
}

function passthrough(args: string[]): void {
  const outcome = runTap(args);
  if (outcome.kind === 'error') return fail(outcome.message, { status: outcome.status, stderr: outcome.stderr });
  printJson(outcome.data);
}

const [command, ...rest] = process.argv.slice(2);
if (!command) fail('usage: pnpm tap <sessions|status|specs|run|reporter|command|pin|dom|aria|inspect> [flags] | pnpm tap:run <spec>');
if (command === 'verdict') {
  await verdict(rest[0]);
} else {
  passthrough([command, ...rest]);
}
