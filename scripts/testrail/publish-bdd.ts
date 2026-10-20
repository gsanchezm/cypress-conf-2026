import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env');
const host = process.env.TESTRAIL_URL;
const username = process.env.TESTRAIL_USER;
const key = process.env.TESTRAIL_API_KEY;
const projectId = process.env.TESTRAIL_PROJECT_ID;
if (!host || !username || !key || projectId !== '1') throw new Error('Expected TestRail credentials and project 1 in .env');

const activeIds = [1, 2, 3, 8];
const selected = process.argv.slice(2).map(Number);
const ids = selected.length ? selected : activeIds;
if (ids.some((id) => !activeIds.includes(id))) throw new Error('Case IDs must be 1, 2, 3, or 8');

const authorization = `Basic ${Buffer.from(`${username}:${key}`).toString('base64')}`;
const response = await fetch(`${host.replace(/\/$/, '')}/index.php?/api/v2/get_project/${projectId}`, {
  headers: { Authorization: authorization },
});
if (!response.ok) throw new Error(`TestRail project lookup failed: HTTP ${response.status}`);
const project = await response.json() as { id: number; name: string };
if (project.id !== 1) throw new Error('Wrong TestRail project');

const env = {
  ...process.env,
  TR_CLI_HOST: host,
  TR_CLI_USERNAME: username,
  TR_CLI_KEY: key,
  TR_CLI_PROJECT_ID: projectId,
  TR_CLI_PROJECT: project.name,
};
const executable = process.env.TESTRAIL_TRCLI || 'trcli';
for (const id of ids) {
  const file = `testrail/bdd/C${id}.feature`;
  const source = readFileSync(file, 'utf8');
  if (!source.includes(`@C${id}\n`)) throw new Error(`${file}: missing case tag`);
  const result = spawnSync(executable, ['-y', 'import_gherkin', '-f', file, '--case-id', String(id), '--update'], {
    env,
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) {
    const diagnostic = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replaceAll(key, '[REDACTED]');
    throw new Error(`C${id}: TestRail CLI failed (${result.status ?? result.error?.message})\n${diagnostic.slice(-1200)}`);
  }
  const templateResponse = await fetch(`${host.replace(/\/$/, '')}/index.php?/api/v2/update_case/${id}`, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: 4,
      ...(id === 3 ? { title: 'Catalog prices are localized for each market' } : {}),
      ...(id === 8 ? { title: 'Checkout completes an order in each market' } : {}),
    }),
  });
  if (!templateResponse.ok) throw new Error(`C${id}: BDD template update failed (HTTP ${templateResponse.status})`);
  const updated = await templateResponse.json() as { id: number; template_id: number; custom_testrail_bdd_scenario?: string | null };
  if (updated.id !== id || updated.template_id !== 4 || !updated.custom_testrail_bdd_scenario) {
    throw new Error(`C${id}: TestRail did not retain BDD content and template`);
  }
  console.log(`C${id}: updated`);
}
