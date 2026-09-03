// The official cypress-tap skill's "non-negotiable verdict rule" as one pure
// function: `tap run` only confirms dispatch, and `tap status` keeps showing
// the previous run's verdict until the new one starts, so a verdict is real
// only when its startedAt moved past the baseline captured before dispatch.
export type TapStage =
  | 'not connected'
  | 'browser not selected'
  | 'spec not selected'
  | 'loading'
  | 'running'
  | 'passed'
  | 'failed';

export interface TapResults {
  passed: number;
  failed: number;
  pending: number;
  skipped: number;
}

export interface TapStatus {
  status: TapStage;
  spec?: string | null;
  startedAt?: string | null;
  totalTests?: number;
  results?: TapResults;
  error?: string | null;
}

export type PollDecision =
  | { action: 'wait' }
  | { action: 'verdict'; verdict: 'passed' | 'failed'; status: TapStatus }
  | { action: 'abort'; reason: string };

function isVerdictStage(stage: TapStage): stage is 'passed' | 'failed' {
  return stage === 'passed' || stage === 'failed';
}

export function classifyStatusPoll(baselineStartedAt: string | null, current: TapStatus, spec: string): PollDecision {
  if (current.status === 'not connected') return { action: 'abort', reason: 'the Cypress session went away while polling' };
  if (!isVerdictStage(current.status)) return { action: 'wait' };
  if (current.spec !== spec) return { action: 'wait' };

  const startedAt = current.startedAt ?? null;
  // startedAt is null only when no run has ever started for the spec: a build
  // failure on first selection. Anything else with a null startedAt is a
  // transient partial payload - keep waiting.
  if (startedAt === null) {
    return current.error ? { action: 'verdict', verdict: 'failed', status: current } : { action: 'wait' };
  }
  if (startedAt === baselineStartedAt) return { action: 'wait' };
  if (current.status === 'passed' && (current.results?.passed ?? 0) === 0) {
    return { action: 'abort', reason: 'status is passed but results.passed is 0: nothing ran' };
  }
  return { action: 'verdict', verdict: current.status, status: current };
}
