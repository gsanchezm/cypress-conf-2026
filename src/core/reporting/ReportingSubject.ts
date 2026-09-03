import type { Observer, TestResult } from './Observer';
import type { RunMetadata, RunObserver, RunSummary } from './RunObserver';

export class ReportingSubject {
  private readonly observers: Observer[] = [];
  private readonly runObservers: RunObserver[] = [];
  // Everything notified so far, so the run-level summary can be built without a second source.
  private readonly collected: TestResult[] = [];

  subscribe(observer: Observer): void {
    this.observers.push(observer);
  }

  notify(results: TestResult[]): void {
    this.collected.push(...results);
    this.observers.forEach((observer) => observer.onSpecComplete(results));
  }

  subscribeRun(observer: RunObserver): void {
    this.runObservers.push(observer);
  }

  async notifyRunComplete(metadata: RunMetadata): Promise<void> {
    const summary: RunSummary = { ...metadata, results: [...this.collected] };
    await Promise.all(this.runObservers.map((observer) => observer.onRunComplete(summary)));
  }
}
