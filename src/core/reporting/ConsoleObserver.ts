import type { Observer, TestResult } from './Observer';

const ICONS: Record<TestResult['state'], string> = {
  passed: '✅',
  failed: '❌',
  pending: '⏸️',
  skipped: '⏭️',
};

export class ConsoleObserver implements Observer {
  onSpecComplete(results: TestResult[]): void {
    results.forEach((result) => {
      console.log(`${ICONS[result.state]} [${result.slice}] ${result.title} (${result.durationMs}ms)`);
    });
  }
}
