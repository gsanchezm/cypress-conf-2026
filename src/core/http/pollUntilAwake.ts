// Pure polling logic for scripts/warmup.ts. Everything with a side effect
// (HTTP, sleeping, the clock) is injected, so node:test drives it with a
// queue of canned answers.
export type Probe = (url: string) => Promise<number>;

export interface PollOptions {
  probe: Probe;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  maxAttempts: number;
  intervalMs: number;
}

export interface PollOutcome {
  url: string;
  awake: boolean;
  status?: number;
  attempts: number;
  elapsedMs: number;
}

// Render's free tier answers 502/503 while a service is still booting; any
// real answer from the app (even a 404) means the cold start is over.
export function isAwake(status: number): boolean {
  return status < 500;
}

// A rejected probe (DNS failure, ECONNRESET, AbortSignal timeout) is a failed
// attempt with no status - never an "awake" one.
async function probeOnce(url: string, probe: Probe): Promise<number | undefined> {
  try {
    return await probe(url);
  } catch {
    return undefined;
  }
}

export async function pollUntilAwake(url: string, options: PollOptions): Promise<PollOutcome> {
  const started = options.now();
  const attempt = async (n: number): Promise<PollOutcome> => {
    const status = await probeOnce(url, options.probe);
    const outcome = { url, status, attempts: n, elapsedMs: options.now() - started };
    if (status !== undefined && isAwake(status)) return { ...outcome, awake: true };
    if (n >= options.maxAttempts) return { ...outcome, awake: false };
    await options.sleep(options.intervalMs);
    return attempt(n + 1);
  };
  return attempt(1);
}

// One aligned line per target, e.g.
//   'frontend  awake 200  attempt 1  1834 ms'
//   'backend   DOWN  503  attempt 12  118402 ms'
export function formatOutcome(name: string, outcome: PollOutcome): string {
  const state = outcome.awake ? 'awake' : 'DOWN';
  const status = outcome.status === undefined ? '---' : String(outcome.status);
  return `${name.padEnd(9)} ${state.padEnd(5)} ${status}  attempt ${outcome.attempts}  ${outcome.elapsedMs} ms`;
}
