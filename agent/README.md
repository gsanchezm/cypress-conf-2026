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

## Policy and CI

The shared checks are [`guard-oracle.ts`](../scripts/hooks/guard-oracle.ts) and [`guard-bash.ts`](../scripts/hooks/guard-bash.ts). A host must connect them to its edit/command lifecycle to get automatic blocking; reading this file alone cannot enforce them. Claude Code's wiring is in `.claude/settings.json`. The [deterministic suite](../.github/workflows/tests.yml) and [CI triage](../.github/workflows/ci-triage.yml) do not call a model provider.
