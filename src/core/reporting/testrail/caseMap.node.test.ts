import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { caseIdFor, loadCaseMap, parseCaseMap, scenarioTitleOf, stripExampleSuffix } from './caseMap';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

const plainFeature = `Feature: Authentication

  @C1001
  Scenario: A standard customer logs in successfully
    Given a standard customer

  Scenario: An untagged scenario
    Given nothing
`;

const outlineFeature = `Feature: Catalog

  Scenario Outline: A standard customer sees pizza prices localized for their market
    When a standard customer browses the catalog in the <market> market

    @C1003
    Examples: United States
      | market        |
      | United States |

    @C1004
    Examples: Mexico
      | market |
      | Mexico |
`;

const inheritedFeature = `@C2000
Feature: Tagged at feature level

  Scenario: Inherits the feature tag
    Given nothing

  @C2001
  Scenario: Overrides with its own tag
    Given nothing
`;

test('parseCaseMap keys a tagged scenario by spec path and title, skipping untagged ones', () => {
  const caseMap = parseCaseMap(plainFeature, 'cypress/e2e/auth/auth.feature');
  assert.deepEqual([...caseMap], [['cypress/e2e/auth/auth.feature::A standard customer logs in successfully', 1001]]);
});

test('parseCaseMap names outline rows the way the preprocessor does, with the tag of their Examples block', () => {
  const caseMap = parseCaseMap(outlineFeature, 'cypress/e2e/catalog/catalog.feature');
  assert.deepEqual([...caseMap], [
    ['cypress/e2e/catalog/catalog.feature::A standard customer sees pizza prices localized for their market (example #1)', 1003],
    ['cypress/e2e/catalog/catalog.feature::A standard customer sees pizza prices localized for their market (example #2)', 1004],
  ]);
});

test('parseCaseMap lets a scenario tag override an inherited feature tag', () => {
  const caseMap = parseCaseMap(inheritedFeature, 'x.feature');
  assert.deepEqual([...caseMap.values()], [2000, 2001]);
});

test('caseIdFor resolves a Cypress result title through the feature title segment and a Windows spec path', () => {
  const caseMap = parseCaseMap(outlineFeature, 'cypress/e2e/catalog/catalog.feature');
  const caseId = caseIdFor(caseMap, {
    specPath: 'cypress\\e2e\\catalog\\catalog.feature',
    title: 'Catalog > A standard customer sees pizza prices localized for their market (example #2)',
  });
  assert.equal(caseId, 1004);
});

test('caseIdFor falls back to the title without the " (example #N)" suffix', () => {
  const caseMap = new Map([['cypress/e2e/catalog/catalog.feature::A standard customer sees pizza prices localized for their market', 1003]]);
  const caseId = caseIdFor(caseMap, {
    specPath: 'cypress/e2e/catalog/catalog.feature',
    title: 'Catalog > A standard customer sees pizza prices localized for their market (example #5)',
  });
  assert.equal(caseId, 1003);
});

test('scenarioTitleOf keeps only the last title segment', () => {
  assert.equal(scenarioTitleOf('Feature > Rule > Scenario (example #1)'), 'Scenario (example #1)');
});

test('stripExampleSuffix leaves a plain title alone', () => {
  assert.equal(stripExampleSuffix('A locked-out customer cannot log in'), 'A locked-out customer cannot log in');
});

test('the shipped feature files map every scenario and outline row to 12 distinct case ids', async () => {
  const specPaths = ['cypress/e2e/auth/auth.feature', 'cypress/e2e/catalog/catalog.feature', 'cypress/e2e/checkout/checkout.feature'];
  const caseMap = await loadCaseMap(specPaths, (specPath) => readFile(join(REPO_ROOT, specPath), 'utf8'));
  assert.equal(new Set(caseMap.values()).size, 12);
});
