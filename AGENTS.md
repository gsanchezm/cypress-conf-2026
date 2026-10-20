# Repository agent contract

This is the shared contract for any coding assistant with repository and shell access. The executable harness is Cypress, TypeScript, pnpm, and GitHub Actions; it does not require an LLM.

## Work on a test

1. Read `README.md` and the neighboring slice under `src/features/{auth,catalog,checkout}/`.
2. Preserve `AtomicScenario` order: `arrangeViaApi` → `hydrateUi` → `assertUi`. Keep at most one API contract claim and one UI render claim per scenario. Put claims in `assert*` methods on facades or strategies. A `.should()` outside those methods is a readiness guard.
3. Treat `.feature` files and claim code as the oracle. For a repair, inspect the failure and change steps, hydration strategies, or `locators/*.json` only. Change the oracle only when the human explicitly asks for a contract change.
4. Use `pnpm` commands. Run `pnpm typecheck` and the affected slice with `pnpm cy:run --browser chrome --spec cypress/e2e/<slice>/<slice>.feature`. With an open Cypress session, use `pnpm tap:run <spec>` and inspect its reporter/DOM before each repair; stop after five attempts.
5. Use `pnpm triage:signals <log>` or `pnpm triage:verdict <log>` for offline diagnosis. Treat the verdict as a signal, not proof of a product regression.

## Boundaries

- Do not put secrets in code or logs. Cloud recording, `cy.prompt`, TestRail writes, and GitHub writes run only when the task explicitly calls for them.
- `scripts/hooks/guard-oracle.ts` and `scripts/hooks/guard-bash.ts` are executable policy checks. Connect them to your host's edit and command hooks, or invoke them when reviewing a proposed operation. `.claude/settings.json` wires them automatically for Claude Code. The deterministic CI suite is the shared verification gate.
- `cy.prompt` is an optional Cypress Cloud AI demonstration. The default suite uses the deterministic UI strategy.

## Shared agent workflow

- Read `agent/README.md` for the five Cypress skills and host setup.
- Use `agent/roles/cy-triage.md` for read-only diagnosis and `agent/roles/cy-fixer.md` for bounded repair. These are plain Markdown instructions, usable by Claude Code, Codex, Copilot, DeepSeek, or another assistant with the required tools.
- The official Cypress skill copies live under `.claude/skills/` for automatic discovery by Claude Code. Any other agent can read their `SKILL.md` files directly; no vendor API is required by the test harness.

## Host adapters

- Claude Code: `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/settings.json`.
- Codex and other shell-capable agents: this `AGENTS.md`, the shared `agent/` instructions, the same `pnpm` commands, and the local policy scripts.
- GitHub Copilot: `.github/copilot-instructions.md` points to this contract.

No agent is required for `pnpm typecheck`, `pnpm cy:run`, TestRail reporting, Cloud recording, or deterministic triage. Agent tools may inspect and repair the harness, but the versioned tests and CI decide pass/fail.
