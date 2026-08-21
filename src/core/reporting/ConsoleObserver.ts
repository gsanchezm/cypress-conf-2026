import pino from 'pino';
import type { Observer, TestResult } from './Observer';

const ICONS: Record<TestResult['state'], string> = {
  passed: '✅',
  failed: '❌',
  pending: '⏸️',
  skipped: '⏭️',
};

const LEVEL_BY_STATE: Record<TestResult['state'], 'info' | 'error'> = {
  passed: 'info',
  failed: 'error',
  pending: 'info',
  skipped: 'info',
};

// setupNodeEvents runs in Cypress's own Node process (not the browser), so
// pino is a real Node-side logger here, not a browser-bundling concern.
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, ignore: 'pid,hostname' },
  },
});

export class ConsoleObserver implements Observer {
  onSpecComplete(results: TestResult[]): void {
    results.forEach((result) => {
      logger[LEVEL_BY_STATE[result.state]](
        { slice: result.slice, state: result.state, durationMs: result.durationMs },
        `${ICONS[result.state]} [${result.slice}] ${result.title} (${result.durationMs}ms)`,
      );
    });
  }
}
