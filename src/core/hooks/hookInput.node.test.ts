import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHookInput } from './hookInput';

test('parses the fields a hook script needs', () => {
  const input = parseHookInput('{"session_id":"s1","tool_name":"Edit","tool_input":{"file_path":"a.ts"}}');
  assert.deepEqual(input, { session_id: 's1', tool_name: 'Edit', tool_input: { file_path: 'a.ts' } });
});

test('rejects a payload without tool_name instead of guessing', () => {
  assert.throws(() => parseHookInput('{"tool_input":{}}'), /tool_name/);
});

test('rejects non-JSON stdin with a readable message', () => {
  assert.throws(() => parseHookInput('not json'), /Hook input is not JSON/);
});
