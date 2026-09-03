import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCloudTestList, findFlakyTests, summariseFlakes } from './flakeAudit';

// The fixture mirrors the documented `cy-cloud test list` output shape
// (docs.cypress.io/cloud/integrations/cloud-cli, "cy-cloud test list" and
// "Workflow: debug a flaky test"); the real Cloud is never called from here.
const SAMPLE = readFileSync(new URL('./fixtures/cy-cloud-test-list.sample.json', import.meta.url), 'utf8');

test('parses a documented test-list document', () => {
  assert.equal(parseCloudTestList(SAMPLE).tests.length, 3);
});

test('rejects a document that is not a test list', () => {
  assert.throws(() => parseCloudTestList('{"runs":[]}'), /expected a cy-cloud "test list" document/);
});

// The docs' own definition: flaky = passed overall, more than one attempt.
test('a test that passed on its second attempt is flaky', () => {
  assert.deepEqual(
    findFlakyTests(parseCloudTestList(SAMPLE)).map((flaky) => flaky.testId),
    ['7c1e9d20-5a3b-4c8d-9e0f-1a2b3c4d5e6f'],
  );
});

test('a test that failed on every attempt is a failure, not a flake', () => {
  assert.equal(
    findFlakyTests(parseCloudTestList(SAMPLE)).some((flaky) => flaky.specFilepath.includes('catalog')),
    false,
  );
});

test('the flaky entry carries the first attempt error and a readable name', () => {
  const [flaky] = findFlakyTests(parseCloudTestList(SAMPLE));
  assert.deepEqual(
    { testName: flaky?.testName, attempts: flaky?.attempts, firstError: flaky?.firstError?.slice(0, 27) },
    {
      testName: 'Checkout > A customer in Mexico completes an order',
      attempts: 2,
      firstError: 'Timed out retrying after 10',
    },
  );
});

test('the report counts totals and flakes', () => {
  const report = summariseFlakes(parseCloudTestList(SAMPLE));
  assert.deepEqual({ totalTests: report.totalTests, flakyCount: report.flakyCount }, { totalTests: 3, flakyCount: 1 });
});
