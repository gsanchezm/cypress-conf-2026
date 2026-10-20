import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { RunSummary } from '../RunObserver';
import { parseCaseMap } from './caseMap';
import { addResultsRequest, mapResults } from './requests';

const specPath = 'cypress/e2e/catalog/catalog.feature';
const source = readFileSync(specPath, 'utf8');
const caseMap = parseCaseMap(source, specPath);
const markets = ['United States', 'Mexico', 'Switzerland', 'Japan', 'Saudi Arabia'];

function summary(): RunSummary {
  return {
    startedAt: '2026-10-20T00:00:00Z',
    finishedAt: '2026-10-20T00:01:00Z',
    browser: 'chrome',
    cypressVersion: '15.21.0',
    labels: {},
    screenshots: [],
    attemptsByTitle: {},
    results: markets.map((market, index) => ({
      specPath,
      title: `Catalog > A standard customer sees pizza prices localized in ${market} (example #${index + 1})`,
      state: market === 'Mexico' ? 'failed' : 'passed',
      durationMs: 1000,
      slice: 'catalog',
    })),
  };
}

test('one parameterized TestRail case retains five market results', () => {
  const run = summary();
  const mapped = mapResults(run, caseMap);
  assert.equal(mapped.length, 5);
  assert.deepEqual([...new Set(mapped.map((result) => result.caseId))], [3]);

  const request = addResultsRequest(7, mapped, run);
  assert.equal(request.method, 'add_results_for_cases/7');
  const body = request.body as { results: { case_id: number; status_id: number; custom_testrail_bdd_scenario_results: { content: string; status_id: number }[] }[] };
  assert.equal(body.results.length, 1);
  assert.equal(body.results[0]?.case_id, 3);
  assert.equal(body.results[0]?.status_id, 5);
  assert.deepEqual(body.results[0]?.custom_testrail_bdd_scenario_results.map((result) => result.status_id), [1, 5, 1, 1, 1]);
  assert.deepEqual(body.results[0]?.custom_testrail_bdd_scenario_results.map((result) => result.content),
    markets.map((market) => `A standard customer sees pizza prices localized in ${market}`));
});

test('tag-filtered markets do not block the selected market in TestRail', () => {
  const run = summary();
  run.results = run.results.map((result) => ({
    ...result,
    state: result.title.includes('Mexico') ? 'passed' : 'pending',
  }));
  const mapped = mapResults(run, caseMap);
  assert.equal(mapped.length, 1);
  const body = addResultsRequest(7, mapped, run).body as { results: { status_id: number; custom_testrail_bdd_scenario_results: unknown[] }[] };
  assert.equal(body.results[0]?.status_id, 1);
  assert.equal(body.results[0]?.custom_testrail_bdd_scenario_results.length, 1);
});
