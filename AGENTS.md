# Repository agent contract

This file is the provider-neutral contract for an assistant working in this repository. Claude Code also reads `CLAUDE.md`; GitHub Copilot reads `.github/copilot-instructions.md`. The executable harness is Cypress, TypeScript, pnpm, and GitHub Actions, and does not require an LLM.

## Work on a test

1. Read `README.md` and the neighboring slice under `src/features/{auth,catalog,checkout}/`.
2. Preserve `AtomicScenario` order: `arrangeViaApi` → `hydrateUi` → `assertUi`. Keep at most one API contract claim and one UI render claim per scenario. Put claims in `assert*` methods on facades or strategies. A `.should()` outside those methods is a readiness guard.
3. Treat `.feature` files and claim code as the oracle. For a repair, inspect the failure and change steps, hydration strategies, or `locators/*.json` only. Change the oracle only when the human explicitly asks for a contract change.
4. Use `pnpm` commands. Run `pnpm typecheck` and the affected slice with `pnpm cy:run --browser chrome --spec cypress/e2e/<slice>/<slice>.feature`. With an open Cypress session, use `pnpm tap:run <spec>` and inspect its reporter/DOM before each repair; stop after five attempts.
5. Use `pnpm triage:signals <log>` or `pnpm triage:verdict <log>` for offline diagnosis. Treat the verdict as a signal, not proof of a product regression.

## Boundaries

- Do not put secrets in code or logs. Cloud recording, `cy.prompt`, TestRail writes, and GitHub writes run only when the task explicitly calls for them.
- `scripts/hooks/guard-oracle.ts` and `scripts/hooks/guard-bash.ts` are executable policy checks. Claude invokes them automatically through `.claude/settings.json`; other agents must run them or use their own hook integration. The deterministic CI suite remains the provider-independent verification gate.
- `cy.prompt` is an optional Cypress Cloud AI demonstration. The default suite uses the deterministic UI strategy.

## Agent adapters

- Claude Code: `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/settings.json`.
- Codex: this `AGENTS.md`; use the same `pnpm` commands and the local hook scripts.
- GitHub Copilot: `.github/copilot-instructions.md` points to this contract.

No agent is required for `pnpm typecheck`, `pnpm cy:run`, TestRail reporting, Cloud recording, or deterministic triage. Agent tools may inspect and repair the harness, but the versioned tests and CI decide pass/fail.
