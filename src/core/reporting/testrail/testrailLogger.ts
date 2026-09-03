import pino from 'pino';

// The two calls the observer makes. pino's Logger satisfies it structurally; tests pass a
// recording object instead.
export interface RunLogger {
  info(context: object, message: string): void;
  error(context: object, message: string): void;
}

// Same transport as ConsoleObserver: this runs in Cypress's Node process, so pino-pretty writes
// straight to the `cypress run` terminal.
export function createTestRailLogger(): RunLogger {
  return pino({
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, ignore: 'pid,hostname' },
    },
  });
}
