import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

// `yaml`'s default YAML 1.2 core schema keeps the `on` key a string; js-yaml
// (YAML 1.1) would turn it into boolean true and this lookup would miss.
const read = (name: string): string => readFileSync(new URL(`../../../.github/workflows/${name}`, import.meta.url), 'utf8');

// workflow_run matches on the other workflow's `name:` string, so a rename of
// tests.yml silently disconnects the triage. This is the invariant that
// keeps them wired.
test('claude-ci-triage listens to the deterministic workflow by its exact name', () => {
  const tests = parse(read('tests.yml')) as { name: string };
  const triage = parse(read('claude-ci-triage.yml')) as { on: { workflow_run: { workflows: string[] } } };
  assert.deepEqual(triage.on.workflow_run.workflows, [tests.name]);
});

test('the triage workflow never records to Cloud, never runs cy.prompt and only uses the Anthropic key secret', () => {
  assert.doesNotMatch(read('claude-ci-triage.yml'), /CYPRESS_RECORD_KEY|--record|cyPrompt|secrets\.(?!ANTHROPIC_API_KEY|GITHUB_TOKEN)/);
});
