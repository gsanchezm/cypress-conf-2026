# Agent entry point

Read [`AGENTS.md`](../AGENTS.md) first. The repository's tests and CI run without an LLM. Any coding assistant with repository and shell access can use these instructions.

## Task roles

| Task | Shared instructions | Output |
| --- | --- | --- |
| Diagnose one failure | [`cy-triage`](roles/cy-triage.md) | Evidence-based JSON verdict; read-only |
| Repair one spec | [`cy-fixer`](roles/cy-fixer.md) | Bounded `cypress open` loop; at most five runs |

Give the relevant role file and the failing spec or run ID to your assistant. A host-specific subagent feature is optional.

## Cypress skills

The five official `cypress-io/ai-toolkit` skill copies are versioned under `.claude/skills/`: [`cypress-tap`](../.claude/skills/cypress-tap/SKILL.md), [`cypress-cloud-cli`](../.claude/skills/cypress-cloud-cli/SKILL.md), [`cypress-author`](../.claude/skills/cypress-author/SKILL.md), [`cypress-explain`](../.claude/skills/cypress-explain/SKILL.md), and [`cypress-docs`](../.claude/skills/cypress-docs/SKILL.md). Claude Code can discover them automatically. For Codex, Copilot, DeepSeek, or another assistant, ask it to read the relevant file; copying a skill into the host's native skill directory is optional.

Skills guide a coding agent as it inspects or edits tests. `cy.prompt` is different: it is an optional runtime UI strategy executed inside Cypress and backed by Cypress Cloud.

## MCP tools and Cloud CLI

`.mcp.json` declares the Cypress Cloud MCP server and a read-only GitHub Actions MCP endpoint. Cypress Cloud MCP gives an agent recorded run and test evidence; GitHub MCP can supply CI logs and artifacts. The shared `cy-triage` role uses these as evidence, while the `.feature` files and `assert*` methods remain the test contract. Claude Code audits calls to these two servers through `scripts/hooks/audit-mcp.ts`; other hosts need their own hook wiring.

`pnpm cloud:status` and `pnpm cloud:runs` use the Cloud CLI. CLI login does not authenticate an MCP client. The checked-in Cypress MCP configuration expects `CYPRESS_MCP_TOKEN` in the agent host's environment, or the host can use OAuth with its own MCP configuration. Never put a token in `.mcp.json`. Check MCP availability in the agent host before claiming a live MCP demo.

TestRail currently writes results through `TestRailObserver`; it is not an MCP integration. TestRail's official Cloud MCP is listed as a closed beta in its September 2026 support documentation. If available for this account later, a read-only TestRail tool could retrieve case C9 or run R7 for triage, but it must not redefine the versioned test oracle.

The [presentation](../docs/index.html) includes English speaker notes for all 38 slides; expanded speaker guides are kept locally outside the repository.

## Policy and CI

The shared checks are [`guard-oracle.ts`](../scripts/hooks/guard-oracle.ts) and [`guard-bash.ts`](../scripts/hooks/guard-bash.ts). A host must connect them to its edit/command lifecycle to get automatic blocking; reading this file alone cannot enforce them. Claude Code's wiring is in `.claude/settings.json`. The [deterministic suite](../.github/workflows/tests.yml) and [CI triage](../.github/workflows/ci-triage.yml) do not call a model provider.
