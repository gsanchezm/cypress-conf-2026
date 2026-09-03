import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pnpmScriptsIn, sectionOf } from './readmeScripts';

const readRepoFile = (relative: string): string => readFileSync(new URL(`../../../${relative}`, import.meta.url), 'utf8');

// CRLF input: on Windows with core.autocrlf the checked-out README carries
// CRLF while the index holds LF, and the section must be found either way.
test('sectionOf returns the body under a ## heading, keeping ### sub-headings and stopping at the next ##', () => {
  const markdown = '# Title\r\n\r\n## First\r\n\r\nalpha\r\n\r\n### Sub\r\n\r\nbeta\r\n\r\n## Second\r\n\r\ngamma\r\n';
  assert.equal(sectionOf(markdown, 'First'), 'alpha\n\n### Sub\n\nbeta');
});

test('pnpmScriptsIn lists each package script once and skips pnpm exec / pnpm dlx binaries', () => {
  const markdown = 'Run `pnpm tap:status`, then `pnpm exec tsx x.ts`, `pnpm dlx js-yaml y.yml` and `pnpm tap:status` again.';
  assert.deepEqual(pnpmScriptsIn(markdown), ['tap:status']);
});

// The README's agentic-loop section is a list of commands the reader pastes.
// A renamed package.json script would leave it pointing at nothing, and a
// missing section throws rather than passing vacuously.
test('every pnpm script named in the README agentic-loop section exists in package.json', () => {
  const { scripts } = JSON.parse(readRepoFile('package.json')) as { scripts: Record<string, string> };
  const missing = pnpmScriptsIn(sectionOf(readRepoFile('README.md'), 'The agentic loop')).filter((name) => !(name in scripts));
  assert.deepEqual(missing, []);
});
