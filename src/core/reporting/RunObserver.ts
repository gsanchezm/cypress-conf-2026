import type { TestResult } from './Observer';

// Run-level facts that no single after:spec knows. Built once from Cypress's after:run
// results object (the same one the Module API resolves) plus config.expose.
export interface RunMetadata {
  startedAt: string;
  finishedAt: string;
  browser: string;
  cypressVersion: string;
  // String-valued config.expose entries (UI_STRATEGY, BREAK_LOCATOR, LOG_LEVEL, apiUrl...).
  labels: Record<string, string>;
  // Absolute paths of every screenshot Cypress saved during the run.
  screenshots: string[];
  // TestResult.title -> number of attempts (1 unless `retries` is configured and the test retried).
  attemptsByTitle: Record<string, number>;
}

export interface RunSummary extends RunMetadata {
  // Every TestResult handed to ReportingSubject.notify during the run, in spec order.
  results: TestResult[];
}

// The run-level counterpart of Observer.onSpecComplete. Async on purpose: run observers talk to
// the network (TestRail) and Cypress awaits the after:run handler's promise.
export interface RunObserver {
  onRunComplete(summary: RunSummary): Promise<void> | void;
}
