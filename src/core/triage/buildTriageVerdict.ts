import { classifyFailureSignals, suggestCategory, type TriageCategory } from './classifyFailureSignals';

export interface TriageVerdict {
  category: TriageCategory | null;
  confidence: number;
  evidence: string[];
  summary: string;
}

// Two distinct matching log lines are required for an automatic rerun. A text
// pattern alone never proves a product regression; low confidence stays visible.
export function buildTriageVerdict(log: string): TriageVerdict {
  const signals = classifyFailureSignals(log);
  const category = suggestCategory(signals);
  if (!category) {
    return { category: null, confidence: 0, evidence: [], summary: 'No known failure signal found; inspect the failed run.' };
  }

  const evidence = [...new Set(signals.filter((signal) => signal.category === category).map((signal) => signal.evidence))].slice(0, 5);
  const confidence = evidence.length >= 2 ? 0.7 : 0.5;
  return {
    category,
    confidence,
    evidence,
    summary: `${category} signal in failed job logs; inspect the run before treating this as a confirmed cause.`,
  };
}
