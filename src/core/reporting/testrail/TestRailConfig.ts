export interface TestRailConfig {
  url: string; // https://<instance>.testrail.io, no trailing slash
  user: string; // the TestRail login (email)
  apiKey: string; // My Settings > API Keys
  projectId: number;
  suiteId?: number; // omit for single-suite projects
  attachScreenshots: boolean; // TESTRAIL_ATTACH=1
  dryRun: boolean; // TESTRAIL_DRY_RUN=1: log payloads with pino instead of sending them
}

type Env = Record<string, string | undefined>;

const REQUIRED = ['TESTRAIL_USER', 'TESTRAIL_API_KEY', 'TESTRAIL_PROJECT_ID'] as const;

// A dry run only needs somewhere to print; these make the payloads readable without real secrets.
const DRY_RUN_PLACEHOLDERS: Env = {
  TESTRAIL_USER: 'dry-run@example.com',
  TESTRAIL_API_KEY: 'dry-run',
  TESTRAIL_PROJECT_ID: '0',
};

function isFlag(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

function toInteger(name: string, value: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`TestRail: ${name} must be a non-negative integer, got "${value}"`);
  return Number(value);
}

function withPlaceholders(env: Env, dryRun: boolean): Env {
  if (!dryRun) return env;
  const provided = Object.fromEntries(Object.entries(env).filter(([, value]) => Boolean(value)));
  return { ...DRY_RUN_PLACEHOLDERS, ...provided };
}

// Throws rather than silently running without TestRail when the URL is set but the rest is not -
// the same loud-on-typo policy as resolveLogLevel and precondition().
export function readTestRailConfig(env: Env): TestRailConfig | undefined {
  const url = env.TESTRAIL_URL?.trim();
  if (!url) return undefined;

  const dryRun = isFlag(env.TESTRAIL_DRY_RUN);
  const resolved = withPlaceholders(env, dryRun);
  const missing = REQUIRED.filter((name) => !resolved[name]);
  if (missing.length > 0) throw new Error(`TestRail: TESTRAIL_URL is set but ${missing.join(', ')} missing`);

  const suiteId = resolved.TESTRAIL_SUITE_ID;
  return {
    url: url.replace(/\/+$/, ''),
    user: resolved.TESTRAIL_USER ?? '',
    apiKey: resolved.TESTRAIL_API_KEY ?? '',
    projectId: toInteger('TESTRAIL_PROJECT_ID', resolved.TESTRAIL_PROJECT_ID ?? ''),
    ...(suiteId ? { suiteId: toInteger('TESTRAIL_SUITE_ID', suiteId) } : {}),
    attachScreenshots: isFlag(resolved.TESTRAIL_ATTACH),
    dryRun,
  };
}
