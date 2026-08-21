// Ordered least-verbose first: a message at level N is emitted when the
// configured level is at least N. Kept as a plain array so the ordering IS
// the comparison, rather than a separate rank table that can drift from it.
export const LOG_LEVELS = ['silent', 'info', 'debug'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];
export type EmittableLevel = Exclude<LogLevel, 'silent'>;

export const DEFAULT_LOG_LEVEL: LogLevel = 'info';

function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}

// Throws rather than falling back to the default on a typo. A run started
// with LOG_LEVEL=debgu would otherwise look configured while logging at
// some other level entirely - the same quiet-wrong-behaviour this framework
// removes everywhere else. See precondition.ts for the same reasoning.
export function resolveLogLevel(configured: string | undefined): LogLevel {
  if (configured === undefined) {
    return DEFAULT_LOG_LEVEL;
  }

  const normalised = configured.trim().toLowerCase();
  if (!isLogLevel(normalised)) {
    throw new Error(`Logging: unknown log level "${configured}". Valid levels: ${LOG_LEVELS.join(', ')}`);
  }
  return normalised;
}

export function shouldLog(configured: string | undefined, required: EmittableLevel): boolean {
  return LOG_LEVELS.indexOf(resolveLogLevel(configured)) >= LOG_LEVELS.indexOf(required);
}
