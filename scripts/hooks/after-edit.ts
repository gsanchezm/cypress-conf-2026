// PostToolUse hook (Edit|Write|MultiEdit): typecheck + the touched file's
// sibling node test, reported back to Claude as additionalContext. Never
// blocks (a PostToolUse hook cannot undo the edit anyway) and prints nothing
// when the edit touched nothing TypeScript sees. Never a Cypress run: far too
// slow for a hook - that is what the cy-fixer loop and `pnpm tap:run` are for.
// Demo: echo '{"tool_name":"Edit","tool_input":{"file_path":"src/core/tap/parseTapOutput.ts","old_string":"a","new_string":"a"}}' | pnpm exec tsx scripts/hooks/after-edit.ts
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseHookInput } from '../../src/core/hooks/hookInput';
import { toEditIntents } from '../../src/core/hooks/editIntents';
import { toProjectRelative } from '../../src/core/hooks/guardOracle';
import { planAfterEditChecks, formatAfterEditContext, type CheckResult } from '../../src/core/hooks/afterEdit';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function run(label: string, command: string): CheckResult {
  const child = spawnSync(command, { cwd: projectDir, shell: true, encoding: 'utf8', windowsHide: true });
  return { label, ok: child.status === 0, output: `${child.stdout ?? ''}${child.stderr ?? ''}` };
}

function runNodeTests(files: string[]): CheckResult {
  const quoted = files.map((file) => `"${file}"`).join(' ');
  return run(`node --test ${files.join(' ')}`, `node --import tsx --test ${quoted}`);
}

function main(): void {
  const input = parseHookInput(readFileSync(0, 'utf8'));
  const paths = toEditIntents(input.tool_name, input.tool_input).map((intent) => toProjectRelative(intent.filePath, projectDir));
  const plan = planAfterEditChecks(paths, (path) => existsSync(`${projectDir}/${path}`));
  if (!plan.typecheck && plan.nodeTestFiles.length === 0) return;

  const results = [
    ...(plan.typecheck ? [run('pnpm typecheck', 'pnpm typecheck')] : []),
    ...(plan.nodeTestFiles.length > 0 ? [runNodeTests(plan.nodeTestFiles)] : []),
  ];
  const output = { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: formatAfterEditContext(results) } };
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`after-edit: ${(error as Error).message}\n`);
  process.exit(1);
}
