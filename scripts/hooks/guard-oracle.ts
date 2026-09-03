// PreToolUse hook (Edit|Write|MultiEdit). Exit 2 + stderr = deny (the strong
// form per the Claude Code hooks reference: stderr becomes the reason shown
// to Claude); exit 0 silently = allow; exit 1 = a broken payload, which is a
// non-blocking hook error so a harness bug cannot wedge every edit.
// Demo: echo '{"tool_name":"Edit","tool_input":{"file_path":"cypress/e2e/auth/auth.feature","old_string":"a","new_string":"b"}}' | pnpm exec tsx scripts/hooks/guard-oracle.ts
import { readFileSync } from 'node:fs';
import { parseHookInput } from '../../src/core/hooks/hookInput';
import { toEditIntents } from '../../src/core/hooks/editIntents';
import { decideOracleGuard } from '../../src/core/hooks/guardOracle';

function main(): number {
  const input = parseHookInput(readFileSync(0, 'utf8'));
  const decision = decideOracleGuard(toEditIntents(input.tool_name, input.tool_input), {
    projectDir: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    allowTestEdits: process.env.ALLOW_TEST_EDITS === '1',
  });
  if (decision.allow) return 0;
  process.stderr.write(`${decision.reason}\n`);
  return 2;
}

try {
  process.exit(main());
} catch (error) {
  process.stderr.write(`guard-oracle: ${(error as Error).message}\n`);
  process.exit(1);
}
