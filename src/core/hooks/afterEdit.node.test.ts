import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planAfterEditChecks, formatAfterEditContext } from './afterEdit';

const exists = (known: string[]) => (path: string) => known.includes(path);

test('a source file with a sibling node test schedules that test', () => {
  const plan = planAfterEditChecks(['src/core/tap/parseTapOutput.ts'], exists(['src/core/tap/parseTapOutput.node.test.ts']));
  assert.deepEqual(plan, { typecheck: true, nodeTestFiles: ['src/core/tap/parseTapOutput.node.test.ts'] });
});

test('editing a node test file schedules that very file', () => {
  const plan = planAfterEditChecks(['src/core/tap/parseTapOutput.node.test.ts'], exists(['src/core/tap/parseTapOutput.node.test.ts']));
  assert.deepEqual(plan.nodeTestFiles, ['src/core/tap/parseTapOutput.node.test.ts']);
});

test('a locator JSON under src is typechecked (resolveJsonModule) but has no test to run', () => {
  assert.deepEqual(planAfterEditChecks(['src/features/auth/locators/auth.locators.json'], exists([])), { typecheck: true, nodeTestFiles: [] });
});

test('a markdown or workflow file schedules nothing', () => {
  assert.deepEqual(planAfterEditChecks(['CLAUDE.md', '.github/workflows/tests.yml'], exists([])), { typecheck: false, nodeTestFiles: [] });
});

test('an all-green run is a one-line context', () => {
  const context = formatAfterEditContext([
    { label: 'pnpm typecheck', ok: true, output: '' },
    { label: 'node --test src/a.node.test.ts', ok: true, output: '# pass 3' },
  ]);
  assert.equal(context, 'after-edit: pnpm typecheck OK; node --test src/a.node.test.ts OK');
});

test('a failure includes the tail of its output, capped', () => {
  const context = formatAfterEditContext([{ label: 'pnpm typecheck', ok: false, output: 'x'.repeat(5000) }]);
  assert.equal(context.length <= 4000 + 'after-edit: pnpm typecheck FAILED\n'.length, true);
});
