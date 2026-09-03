import type { GuardDecision } from './guardOracle';

interface BashRule {
  pattern: RegExp;
  reason: string;
}

// The repo owner's hard gates that can be recognised from a command line.
// Prose in CLAUDE.md says the same thing; this makes it a deny.
const RULES: readonly BashRule[] = [
  {
    pattern: /UI_STRATEGY=cyPrompt/,
    reason: 'never run cy.prompt: it is billed per execution (100/month on the free plan) and only the repo owner triggers it',
  },
  {
    pattern: /cy-prompt-suite\.yml/,
    reason: "never dispatch cy-prompt-suite.yml: it records and runs cy.prompt on the owner's Cloud budget",
  },
  {
    pattern: /--record\b|CYPRESS_RECORD_KEY/,
    reason: 'never record to Cypress Cloud (--record / CYPRESS_RECORD_KEY) from an agent session',
  },
  {
    pattern: /\bgit\s+push\b/,
    reason: 'never push: the owner reviews and pushes; agents commit on their worktree branch only',
  },
];

export function decideBashGuard(command: string): GuardDecision {
  const hit = RULES.find((rule) => rule.pattern.test(command));
  if (!hit) return { allow: true };
  return { allow: false, reason: `Blocked by scripts/hooks/guard-bash.ts: ${hit.reason}.` };
}
