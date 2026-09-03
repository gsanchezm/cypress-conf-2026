import { appendFileSync } from 'node:fs';
import type { Observer, TestResult } from './Observer';
import { renderSpecSummary, renderStrategyComparison } from './summaryMarkdown';

export class GithubActionsSummaryObserver implements Observer {
  // Everything this job has reported so far, so the by-strategy table is
  // cumulative rather than per spec.
  private readonly seen: TestResult[] = [];

  constructor(private readonly summaryFilePath: string | undefined) {}

  onSpecComplete(results: TestResult[]): void {
    if (!this.summaryFilePath || results.length === 0) return;
    this.seen.push(...results);
    appendFileSync(this.summaryFilePath, `\n${renderSpecSummary(results)}\n\n${renderStrategyComparison(this.seen)}\n`);
  }
}
