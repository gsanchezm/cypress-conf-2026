// The subset of the Claude Code hook stdin payload these scripts read. Shape
// verified against code.claude.com/docs/en/hooks on 2026-09-02: every event
// carries session_id / cwd / hook_event_name / tool_name / tool_input, and
// PostToolUse adds tool_response.
export interface HookInput {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  tool_name: string;
  tool_input?: unknown;
  tool_response?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Hook input is not JSON');
  }
}

export function parseHookInput(text: string): HookInput {
  const parsed = tryParseJson(text);
  if (!isRecord(parsed) || typeof parsed.tool_name !== 'string') {
    throw new Error('Hook input has no tool_name');
  }
  const { session_id, cwd, hook_event_name, tool_name, tool_input, tool_response } = parsed;
  return {
    ...(typeof session_id === 'string' ? { session_id } : {}),
    ...(typeof cwd === 'string' ? { cwd } : {}),
    ...(typeof hook_event_name === 'string' ? { hook_event_name } : {}),
    tool_name,
    ...(tool_input !== undefined ? { tool_input } : {}),
    ...(tool_response !== undefined ? { tool_response } : {}),
  };
}
