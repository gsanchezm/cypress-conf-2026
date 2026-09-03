import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEditIntents } from './editIntents';

test('Edit becomes one intent with before and after', () => {
  assert.deepEqual(toEditIntents('Edit', { file_path: 'src/a.ts', old_string: 'x', new_string: 'y' }), [
    { filePath: 'src/a.ts', before: 'x', after: 'y' },
  ]);
});

test('Write becomes one intent whose before is empty and after is the whole content', () => {
  assert.deepEqual(toEditIntents('Write', { file_path: 'src/a.ts', content: 'body' }), [{ filePath: 'src/a.ts', before: '', after: 'body' }]);
});

test('MultiEdit with an edits array yields one intent per edit on the same file', () => {
  const intents = toEditIntents('MultiEdit', {
    file_path: 'src/a.ts',
    edits: [
      { old_string: '1', new_string: '2' },
      { old_string: '3', new_string: '4' },
    ],
  });
  assert.deepEqual(intents.map((intent) => intent.after), ['2', '4']);
});

// The hooks reference shows MultiEdit's tool_input both as an object with
// `edits` and as a bare array of Edit objects; accept both.
test('MultiEdit as a bare array of edits is accepted', () => {
  const intents = toEditIntents('MultiEdit', [{ file_path: 'src/a.ts', old_string: '1', new_string: '2' }]);
  assert.deepEqual(intents, [{ filePath: 'src/a.ts', before: '1', after: '2' }]);
});

test('an unknown tool yields no intents', () => {
  assert.deepEqual(toEditIntents('Bash', { command: 'ls' }), []);
});
