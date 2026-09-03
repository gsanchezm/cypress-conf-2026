// Claude Code names MCP tools `mcp__<server>__<tool>`, so a hook matcher such
// as `mcp__cypress-cloud__.*|mcp__github__.*` names the servers it audits.
// Pulling those names out lets a test pin them to the servers .mcp.json
// declares: rename one side and the audit hook would silently stop logging.
const SERVER_IN_MATCHER = /mcp__([\w-]+?)__/g;

export function serverNamesInMatcher(matcher: string): string[] {
  const names = [...matcher.matchAll(SERVER_IN_MATCHER)].map(([, name]) => name);
  return [...new Set(names)];
}
