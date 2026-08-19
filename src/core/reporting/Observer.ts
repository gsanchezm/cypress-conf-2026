export interface TestResult {
  specPath: string;
  title: string;
  state: 'passed' | 'failed' | 'pending' | 'skipped';
  durationMs: number;
  slice: string;
}

export interface Observer {
  onSpecComplete(results: TestResult[]): void;
}
