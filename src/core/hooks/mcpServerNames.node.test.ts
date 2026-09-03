import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serverNamesInMatcher } from './mcpServerNames';

const projectRoot = new URL('../../../', import.meta.url);
const readJson = <T>(relativePath: string): T => JSON.parse(readFileSync(new URL(relativePath, projectRoot), 'utf8')) as T;

interface McpConfig {
  mcpServers: Record<string, unknown>;
}

interface HookSettings {
  hooks: { PostToolUse: Array<{ matcher: string }> };
}

test('a hook matcher yields the MCP server names it covers, in order and without duplicates', () => {
  assert.deepEqual(serverNamesInMatcher('mcp__cypress-cloud__.*|mcp__github__.*|mcp__github__get_job_logs'), ['cypress-cloud', 'github']);
});

test('every MCP server declared in .mcp.json is covered by the audit-mcp PostToolUse matcher', () => {
  const declared = Object.keys(readJson<McpConfig>('.mcp.json').mcpServers).sort();
  const audited = readJson<HookSettings>('.claude/settings.json').hooks.PostToolUse.flatMap((entry) => serverNamesInMatcher(entry.matcher));
  assert.deepEqual(declared, [...new Set(audited)].sort());
});
