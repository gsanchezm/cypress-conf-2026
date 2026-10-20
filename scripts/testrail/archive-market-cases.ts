import { loadEnvFile } from 'node:process';

loadEnvFile('.env');
const host = process.env.TESTRAIL_URL?.replace(/\/$/, '');
const username = process.env.TESTRAIL_USER;
const key = process.env.TESTRAIL_API_KEY;
if (!host || !username || !key || process.env.TESTRAIL_PROJECT_ID !== '1') {
  throw new Error('Expected TestRail credentials and project 1 in .env');
}

const authorization = `Basic ${Buffer.from(`${username}:${key}`).toString('base64')}`;
async function request<T>(method: string, body?: object): Promise<T> {
  const response = await fetch(`${host}/index.php?/api/v2/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: authorization, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`${method}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

interface Section { id: number; name: string; suite_id: number }
interface Case { id: number; title: string; section_id: number }
const source = [{ name: 'Catalog', ids: [4, 5, 6, 7] }, { name: 'Checkout', ids: [9, 10, 11, 12] }];
const archiveName = 'Legacy market cases (before BDD parameterization)';
const sectionResponse = await request<{ sections: Section[] } | Section[]>('get_sections/1');
const sections = Array.isArray(sectionResponse) ? sectionResponse : sectionResponse.sections;
const archive = sections.find((section) => section.name === archiveName);
const cases = await Promise.all(source.flatMap((group) => group.ids.map((id) => request<Case>(`get_case/${id}`))));
for (const group of source) {
  const section = sections.find((item) => item.name === group.name);
  if (!section) throw new Error(`Missing source section: ${group.name}`);
  for (const id of group.ids) {
    const item = cases.find((candidate) => candidate.id === id);
    if (!item || (item.section_id !== section.id && item.section_id !== archive?.id)) {
      throw new Error(`C${id}: unexpected section; no cases moved`);
    }
  }
}
const suiteIds = new Set(source.map((group) => sections.find((item) => item.name === group.name)?.suite_id));
if (suiteIds.size !== 1) throw new Error('Source sections are in different suites');
const target = archive ?? await request<Section>('add_section/1', {
  name: archiveName,
  suite_id: [...suiteIds][0],
  description: 'Historical per-market cases replaced by parameterized BDD cases C3 and C8. Kept for earlier runs.',
});
for (const item of cases) {
  if (item.section_id === target.id) continue;
  const updated = await request<Case>(`update_case/${item.id}`, { section_id: target.id });
  if (updated.id !== item.id || updated.section_id !== target.id) throw new Error(`C${item.id}: move not confirmed`);
  console.log(`C${item.id}: moved to section ${target.id}`);
}
for (const id of [3, 8, ...cases.map((item) => item.id)]) {
  const item = await request<Case>(`get_case/${id}`);
  if (id === 3 && item.section_id !== sections.find((section) => section.name === 'Catalog')?.id) throw new Error('C3 left Catalog');
  if (id === 8 && item.section_id !== sections.find((section) => section.name === 'Checkout')?.id) throw new Error('C8 left Checkout');
  if (id !== 3 && id !== 8 && item.section_id !== target.id) throw new Error(`C${id}: archive verification failed`);
}
console.log(`Verified C3 in Catalog, C8 in Checkout, and eight historical cases in section ${target.id}`);
