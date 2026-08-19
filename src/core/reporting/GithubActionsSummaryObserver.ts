import { appendFileSync } from 'node:fs';
import type { Observer, TestResult } from './Observer';

export class GithubActionsSummaryObserver implements Observer {
  constructor(private readonly summaryFilePath: string | undefined) {}

  onSpecComplete(results: TestResult[]): void {
    if (!this.summaryFilePath || results.length === 0) return;
    const rows = results
      .map((r) => `| ${r.slice} | ${r.title} | ${r.state} | ${r.durationMs}ms |`)
      .join('\n');
    appendFileSync(
      this.summaryFilePath,
      `\n| Slice | Test | State | Duration |\n|---|---|---|---|\n${rows}\n`,
    );
  }
}
