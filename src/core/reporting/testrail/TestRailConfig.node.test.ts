import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTestRailConfig } from './TestRailConfig';

const fullEnv = {
  TESTRAIL_URL: 'https://acme.testrail.io/',
  TESTRAIL_USER: 'qa@acme.example',
  TESTRAIL_API_KEY: 'k3y',
  TESTRAIL_PROJECT_ID: '7',
};

test('readTestRailConfig is undefined when TESTRAIL_URL is not set, so nothing gets subscribed', () => {
  assert.equal(readTestRailConfig({ TESTRAIL_USER: 'someone' }), undefined);
});

test('readTestRailConfig strips the trailing slash from the instance URL', () => {
  assert.equal(readTestRailConfig(fullEnv)?.url, 'https://acme.testrail.io');
});

test('readTestRailConfig names every missing required variable', () => {
  assert.throws(() => readTestRailConfig({ TESTRAIL_URL: 'https://acme.testrail.io' }), /TESTRAIL_USER, TESTRAIL_API_KEY, TESTRAIL_PROJECT_ID/);
});

test('readTestRailConfig rejects a non-numeric project id', () => {
  assert.throws(() => readTestRailConfig({ ...fullEnv, TESTRAIL_PROJECT_ID: 'seven' }), /TESTRAIL_PROJECT_ID/);
});

test('readTestRailConfig reads the optional suite id and the attach flag', () => {
  const config = readTestRailConfig({ ...fullEnv, TESTRAIL_SUITE_ID: '3', TESTRAIL_ATTACH: '1' });
  assert.deepEqual([config?.suiteId, config?.attachScreenshots], [3, true]);
});

test('readTestRailConfig in dry-run mode needs only the URL', () => {
  const config = readTestRailConfig({ TESTRAIL_URL: 'https://example.testrail.io', TESTRAIL_DRY_RUN: '1' });
  assert.deepEqual([config?.dryRun, config?.projectId], [true, 0]);
});
