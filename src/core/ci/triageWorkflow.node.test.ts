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

type Step = { id?: string; if?: string };
const stepGate = (id: string): string => {
  const { jobs } = parse(read('claude-ci-triage.yml')) as { jobs: { triage: { steps: Step[] } } };
  const step = jobs.triage.steps.find((candidate) => candidate.id === id);
  if (!step?.if) throw new Error(`step "${id}" has no if: gate`);
  return step.if.replace(/\s+/g, ' ').trim();
};

// workflow_run `completed` fires again for every `gh run rerun`, so an
// uncapped flake verdict would rerun forever. The cap lives in the rerun gate.
test('the rerun gate stops after the third attempt of the failed run', () => {
  assert.match(stepGate('rerun'), /github\.event\.workflow_run\.run_attempt < 3/);
});

// If the two gates drift apart a verdict can be silently dropped (neither
// rerun nor reported). The report gate must be the exact negation of the
// rerun gate behind the shared "a verdict exists" guard.
test('the report gate is the exact complement of the rerun gate', () => {
  const guard = "steps.triage.outputs.structured_output != '' && ";
  const rerun = stepGate('rerun');
  assert.equal(stepGate('report'), `${guard}!(${rerun.slice(guard.length)})`);
});
