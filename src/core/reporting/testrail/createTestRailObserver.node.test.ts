import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestRailObserver } from './createTestRailObserver';
import { TestRailObserver } from './TestRailObserver';

test('createTestRailObserver returns undefined when TESTRAIL_URL is unset', () => {
  assert.equal(createTestRailObserver({}, 'C:/proj'), undefined);
});

test('createTestRailObserver builds an observer for a dry run from the URL alone', () => {
  const observer = createTestRailObserver({ TESTRAIL_URL: 'https://example.testrail.io', TESTRAIL_DRY_RUN: '1' }, 'C:/proj');
  assert.equal(observer instanceof TestRailObserver, true);
});
