import type { HookInput } from './hookInput';

const MAX_INPUT_CHARS = 500;

// One JSON line per MCP tool call - who asked which server for what, and how
// much came back. Enough to audit an agent's Cloud/GitHub reads after the
// fact without storing the (possibly large, possibly sensitive) payloads.
export function toAuditLine(input: HookInput, now: Date): string {
  return JSON.stringify({
    ts: now.toISOString(),
    session: input.session_id ?? null,
    tool: input.tool_name,
    input: JSON.stringify(input.tool_input ?? null).slice(0, MAX_INPUT_CHARS),
    responseBytes: JSON.stringify(input.tool_response ?? '').length,
  });
}
