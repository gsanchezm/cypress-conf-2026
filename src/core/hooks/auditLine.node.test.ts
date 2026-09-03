import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toAuditLine } from './auditLine';

const now = new Date('2026-09-02T12:00:00.000Z');

test('an MCP call becomes one JSON line with timestamp, session, tool, input and response size', () => {
  const line = toAuditLine(
    { session_id: 's1', tool_name: 'mcp__cypress-cloud__cypress_get_failed_tests', tool_input: { projectId: '5v45hh' }, tool_response: 'abc' },
    now,
  );
  assert.deepEqual(JSON.parse(line), {
    ts: '2026-09-02T12:00:00.000Z',
    session: 's1',
    tool: 'mcp__cypress-cloud__cypress_get_failed_tests',
    input: '{"projectId":"5v45hh"}',
    responseBytes: 5,
  });
});

test('a large input is truncated to 500 characters so the audit file stays readable', () => {
  const line = toAuditLine({ tool_name: 'mcp__github__get_job_logs', tool_input: { blob: 'y'.repeat(2000) } }, now);
  assert.equal((JSON.parse(line) as { input: string }).input.length, 500);
});
