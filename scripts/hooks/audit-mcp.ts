// PostToolUse hook (mcp__cypress-cloud__.*|mcp__github__.*): append one JSON
// line per MCP call to .claude/audit.jsonl (git-ignored) so an agent's
// Cloud/GitHub reads can be reviewed after the fact. Never blocks.
// Demo: echo '{"session_id":"demo","tool_name":"mcp__cypress-cloud__cypress_get_failed_tests","tool_input":{"projectId":"5v45hh"},"tool_response":"[]"}' | pnpm exec tsx scripts/hooks/audit-mcp.ts
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseHookInput } from '../../src/core/hooks/hookInput';
import { toAuditLine } from '../../src/core/hooks/auditLine';

try {
  const dir = join(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), '.claude');
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, 'audit.jsonl'), `${toAuditLine(parseHookInput(readFileSync(0, 'utf8')), new Date())}\n`);
} catch (error) {
  process.stderr.write(`audit-mcp: ${(error as Error).message}\n`);
  process.exit(1);
}
