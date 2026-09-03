import { readFile } from 'node:fs/promises';
import { createDryRunFetch } from './dryRunFetch';
import { TestRailClient, type FetchLike } from './TestRailClient';
import { readTestRailConfig } from './TestRailConfig';
import { TestRailObserver } from './TestRailObserver';
import { createTestRailLogger } from './testrailLogger';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const liveFetch: FetchLike = (url, init) => fetch(url, init);

// The Node-side composition of the TestRail observer, called from cypress.config.ts. Undefined
// (nothing subscribed, zero cost) unless TESTRAIL_URL is set; dry-run swaps fetch for a logger.
export function createTestRailObserver(env: Record<string, string | undefined>, projectRoot: string): TestRailObserver | undefined {
  const config = readTestRailConfig(env);
  if (!config) return undefined;

  const logger = createTestRailLogger();
  const client = new TestRailClient(config, { fetch: config.dryRun ? createDryRunFetch(logger) : liveFetch, sleep });
  logger.info(
    { url: config.url, projectId: config.projectId, dryRun: config.dryRun, attachScreenshots: config.attachScreenshots },
    'TestRail: observer subscribed',
  );
  return new TestRailObserver(config, {
    client,
    logger,
    projectRoot,
    readText: (path) => readFile(path, 'utf8'),
    readBinary: (path) => readFile(path),
  });
}
