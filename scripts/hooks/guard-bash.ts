// PreToolUse hook (Bash). Same contract as guard-oracle: exit 2 + stderr =
// deny, exit 0 = allow, exit 1 = malformed payload (non-blocking).
// Demo: echo '{"tool_name":"Bash","tool_input":{"command":"git push"}}' | pnpm exec tsx scripts/hooks/guard-bash.ts
import { readFileSync } from 'node:fs';
import { parseHookInput } from '../../src/core/hooks/hookInput';
import { decideBashGuard } from '../../src/core/hooks/guardBash';

function commandOf(toolInput: unknown): string | undefined {
  if (typeof toolInput !== 'object' || toolInput === null) return undefined;
  const { command } = toolInput as { command?: unknown };
  return typeof command === 'string' ? command : undefined;
}

function main(): number {
  const input = parseHookInput(readFileSync(0, 'utf8'));
  const command = commandOf(input.tool_input);
  if (command === undefined) return 0;
  const decision = decideBashGuard(command);
  if (decision.allow) return 0;
  process.stderr.write(`${decision.reason}\n`);
  return 2;
}

try {
  process.exit(main());
} catch (error) {
  process.stderr.write(`guard-bash: ${(error as Error).message}\n`);
  process.exit(1);
}
