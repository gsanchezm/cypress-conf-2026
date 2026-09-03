export interface EditIntent {
  filePath: string;
  before: string;
  after: string;
}

interface EditLike {
  file_path?: unknown;
  old_string?: unknown;
  new_string?: unknown;
  content?: unknown;
  edits?: unknown;
}

const EDITING_TOOLS = ['Edit', 'Write', 'MultiEdit'];

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

function fromEdit(edit: EditLike, fallbackPath: string): EditIntent[] {
  const filePath = asString(edit.file_path) || fallbackPath;
  if (!filePath) return [];
  if (typeof edit.content === 'string') return [{ filePath, before: '', after: edit.content }];
  return [{ filePath, before: asString(edit.old_string), after: asString(edit.new_string) }];
}

// Normalises Edit / Write / MultiEdit payloads into one shape so the guard has
// a single thing to reason about. MultiEdit is accepted both as
// { file_path, edits: [...] } and as a bare array of Edit objects, because the
// hooks reference shows both.
export function toEditIntents(toolName: string, toolInput: unknown): EditIntent[] {
  if (!EDITING_TOOLS.includes(toolName)) return [];
  if (Array.isArray(toolInput)) return toolInput.flatMap((edit: EditLike) => fromEdit(edit, ''));
  if (typeof toolInput !== 'object' || toolInput === null) return [];

  const input = toolInput as EditLike;
  if (Array.isArray(input.edits)) {
    return input.edits.flatMap((edit: EditLike) => fromEdit(edit, asString(input.file_path)));
  }
  return fromEdit(input, '');
}
