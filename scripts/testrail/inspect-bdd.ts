import { loadEnvFile } from 'node:process';
import { readFile } from 'node:fs/promises';

loadEnvFile('.env');
const url = process.env.TESTRAIL_URL?.replace(/\/$/, '');
const user = process.env.TESTRAIL_USER;
const key = process.env.TESTRAIL_API_KEY;
const projectId = process.env.TESTRAIL_PROJECT_ID;
if (!url || !user || !key || projectId !== '1') throw new Error('Expected TestRail credentials and project 1 in .env');

const authorization = `Basic ${Buffer.from(`${user}:${key}`).toString('base64')}`;
async function get<T>(method: string): Promise<T> {
  const response = await fetch(`${url}/index.php?/api/v2/${method}`, {
    headers: { Authorization: authorization },
  });
  if (!response.ok) throw new Error(`${method}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

interface Case {
  id: number;
  title: string;
  section_id: number;
  template_id: number;
  custom_testrail_bdd_scenario?: string | null;
}
interface Template { id: number; name: string }

const project = await get<{ id: number; name: string }>(`get_project/${projectId}`);
console.log(`Project: ${project.id}:${project.name}`);
const templates = await get<Template[]>(`get_templates/${projectId}`);
console.log(`Templates: ${templates.map((item) => `${item.id}:${item.name}`).join(', ')}`);
for (const id of [1, 2, 3, 8]) {
  const item = await get<Case>(`get_case/${id}`);
  if (item.id !== id || item.template_id !== 4 || !item.custom_testrail_bdd_scenario) {
    throw new Error(`C${id}: BDD template or scenario missing`);
  }
  const expected = await readFile(`testrail/bdd/C${id}.feature`, 'utf8');
  const bdd = JSON.parse(item.custom_testrail_bdd_scenario) as { content: string }[];
  const actual = bdd.map((scenario) => scenario.content).join('\n');
  const normalize = (line: string): string => line.trim().replace(/\s*\|\s*/g, '|').replace(/\s+/g, ' ');
  const actualLines = actual.split('\n').map(normalize);
  for (const line of expected.split('\n')) {
    const trimmed = line.trim();
    if (!/^(Scenario|Given|When|Then|Examples|\|)/.test(trimmed)) continue;
    const wanted = normalize(trimmed.startsWith('Examples:') ? 'Examples:' : trimmed);
    if (!actualLines.includes(wanted)) {
      throw new Error(`C${id}: missing BDD line: ${trimmed}`);
    }
  }
  console.log(`C${item.id}: verified | ${item.title} | section ${item.section_id}`);
}

const runFlag = process.argv.indexOf('--run');
if (runFlag >= 0) {
  const runId = Number(process.argv[runFlag + 1]);
  if (!Number.isInteger(runId) || runId < 1) throw new Error('Expected positive --run ID');
  const run = await get<{ id: number; is_completed: boolean }>(`get_run/${runId}`);
  const testsResponse = await get<{ tests: { case_id: number }[] } | { case_id: number }[]>(`get_tests/${runId}`);
  const tests = Array.isArray(testsResponse) ? testsResponse : testsResponse.tests;
  const response = await get<{ results: { status_id: number; custom_testrail_bdd_scenario_results?: string | unknown[] }[] } | { status_id: number; custom_testrail_bdd_scenario_results?: string | unknown[] }[]>(`get_results_for_run/${runId}`);
  const results = Array.isArray(response) ? response : response.results;
  if (run.id !== runId || !run.is_completed || !results || results.length !== 4) throw new Error(`R${runId}: incomplete or not four results`);
  if (JSON.stringify(tests.map((item) => item.case_id).sort((a, b) => a - b)) !== JSON.stringify([1, 2, 3, 8])) throw new Error(`R${runId}: wrong case IDs`);
  const lengths = results.map((result) => {
    const field = result.custom_testrail_bdd_scenario_results;
    const scenarios = typeof field === 'string' ? JSON.parse(field) as unknown[] : field;
    return scenarios?.length ?? 0;
  }).sort((a, b) => a - b);
  if (JSON.stringify(lengths) !== JSON.stringify([1, 1, 5, 5])) throw new Error(`R${runId}: missing market scenario results: ${lengths}`);
  console.log(`R${runId}: verified four case results with scenario counts ${lengths.join(', ')}`);
}
