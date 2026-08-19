import type { Observer, TestResult } from './Observer';

export class ReportingSubject {
  private readonly observers: Observer[] = [];

  subscribe(observer: Observer): void {
    this.observers.push(observer);
  }

  notify(results: TestResult[]): void {
    this.observers.forEach((observer) => observer.onSpecComplete(results));
  }
}
