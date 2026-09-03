import { formatOutcome, pollUntilAwake } from '../src/core/http/pollUntilAwake';

// Both OmniPizza services are Render free-tier deploys that sleep after
// idling and take 30-60 s to answer their first request. Run `pnpm warmup`
// five minutes before a demo or a CI-equivalent local run so the first
// cy.request() is not the one paying for the cold start.
//
// Hosts are duplicated from cypress.config.ts on purpose: importing the
// config would pull the whole `cypress` module into a plain script.
const TARGETS = [
  { name: 'frontend', url: 'https://omnipizza-frontend.onrender.com/' },
  { name: 'backend', url: 'https://omnipizza-backend.onrender.com/api/docs' },
];
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 12;
const INTERVAL_MS = 10_000;

const probe = async (url: string): Promise<number> =>
  (await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: 'manual' })).status;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const started = Date.now();
const outcomes = await Promise.all(
  TARGETS.map(async (target) => {
    const outcome = await pollUntilAwake(target.url, {
      probe,
      sleep,
      now: Date.now,
      maxAttempts: MAX_ATTEMPTS,
      intervalMs: INTERVAL_MS,
    });
    console.log(formatOutcome(target.name, outcome));
    return outcome;
  }),
);
console.log(`total     ${Date.now() - started} ms`);
process.exitCode = outcomes.every((outcome) => outcome.awake) ? 0 : 1;
