// `cypress tap` on Windows + Node 24 (nodejs/node#64322) prints its full
// result and then aborts in libuv teardown: the assertion below lands on
// stderr and the process exits 0xC0000409 instead of 0. The JSON on stdout is
// intact every time - verified 2026-09-02 on every subcommand including
// --help - so the crash is noise to strip, not a failure to report.
export const LIBUV_CLOSING_ASSERTION = 'Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)';

// 0xC0000409 as Node reports it: unsigned from spawnSync on this machine,
// signed in some shells' $?. The stderr text is the primary signal because
// Git Bash re-maps the code again (127-style values); the codes are a fallback
// for a caller that captured stdout only.
export const LIBUV_CRASH_EXIT_CODES: readonly number[] = [-1073740791, 3221226505];

export interface RawProcessOutput {
  status: number | null;
  stdout: string;
  stderr: string;
}

export interface TapSuccess<T> {
  kind: 'ok';
  data: T;
  crashedOnExit: boolean;
}

export interface TapFailure {
  kind: 'error';
  message: string;
  status: number | null;
  stdout: string;
  stderr: string;
}

export type TapOutcome<T> = TapSuccess<T> | TapFailure;

export function isLibuvTeardownCrash(raw: RawProcessOutput): boolean {
  if (raw.stderr.includes(LIBUV_CLOSING_ASSERTION)) return true;
  return raw.status !== null && LIBUV_CRASH_EXIT_CODES.includes(raw.status);
}

export function stripLibuvNoise(stderr: string): string {
  return stderr
    .split(/\r?\n/)
    .filter((line) => !line.includes(LIBUV_CLOSING_ASSERTION))
    .join('\n')
    .trim();
}

function tryParseJson(text: string): { parsed: true; value: unknown } | { parsed: false } {
  try {
    return { parsed: true, value: JSON.parse(text) };
  } catch {
    return { parsed: false };
  }
}

export function parseTapOutput<T = unknown>(raw: RawProcessOutput): TapOutcome<T> {
  const crashed = isLibuvTeardownCrash(raw);
  const stdout = raw.stdout.trim();
  const stderr = stripLibuvNoise(raw.stderr);
  const failure = (message: string): TapFailure => ({ kind: 'error', message, status: raw.status, stdout, stderr });

  if (raw.status !== 0 && !crashed) {
    return failure(stderr || stdout || `cypress tap exited with status ${raw.status}`);
  }
  if (stdout.length === 0) return failure(stderr || 'cypress tap printed nothing');

  const json = tryParseJson(stdout);
  if (!json.parsed) return failure(`cypress tap printed non-JSON output: ${stdout}`);
  return { kind: 'ok', data: json.value as T, crashedOnExit: crashed };
}
