# Agent harness rules — cypress-conf-2026

The provider-neutral contract is in `AGENTS.md`. The README explains the framework. This file explains how an agent (Claude Code, a subagent, or
`claude-code-action` in CI) is allowed to work inside it. Every rule here is the repo owner's.

## Commands

- `pnpm typecheck` · `pnpm test:unit:node` — fast and offline; the PostToolUse hook runs them after every edit.
- `pnpm tap:status` · `pnpm tap:specs` · `pnpm tap:run <spec>` — drive the open `cypress open` session.
  `pnpm tap <subcommand> [flags]` passes through `reporter`, `command`, `pin`, `dom`, `aria`, `inspect`, `sessions`.
- `pnpm cy:run --browser chrome --spec cypress/e2e/<slice>/<slice>.feature` — headless batch of ONE slice
  (`auth`, `catalog`, `checkout`). The whole suite only as a final verification.
- `pnpm flake-audit <cy-cloud test-list json>` · `pnpm triage:signals <log file>` — offline triage helpers;
  fixtures under `src/core/{cloud,triage}/fixtures/`, never a live Cloud call.

## Non-negotiables

1. **pnpm only.** Never `npm`/`npx`; one-offs go through `pnpm dlx`.
2. **Assertion budget: one assertion per test; two only with a comment that justifies it.** Claims live only
   in `assert*` methods on a facade or strategy (`src/features/**/{facade,strategies}/*.ts`); a `.should()`
   anywhere else is a guard (`src/core/testing/precondition.ts` draws the line). The PreToolUse hook
   `guard-oracle` denies edits to `cypress/e2e/**/*.feature` and to claim code (`assert*`, `.should(`,
   `expect(`) in those files; fix step definitions, strategies and `locators/*.json` instead. A human
   changing the contract sets `ALLOW_TEST_EDITS=1` in the environment — that is the only override.
3. **Style:** guard clauses / early returns over nested ifs; `map`/`flatMap`/`filter` over `for` loops;
   small focused files; TypeScript strict; aliases `@/*` → `src`, `@support/*` → `cypress/support`
   (`scripts/**` and tests use relative imports).
4. **`Cypress.expose()` + `--expose KEY=VALUE`, never `Cypress.env()`** (Cypress 16 removes it).
5. **Pure logic goes in `src/**` with a sibling `*.node.test.ts`** (`pnpm test:unit:node`). Specs are
   `cypress/e2e/**/*.feature` + `src/features/**/steps/*.steps.ts`; scripts in `scripts/**` only do I/O.
6. **Follow the neighbours:** Facade / Strategy / Observer / Decorator over `SelectorSource` /
   AtomicScenario (arrange via API → hydrate UI → assert). Read the sibling files before adding one.

## Working with the live app

- **One spec at a time.** With a `cypress open` session use `pnpm tap:run <spec>`: it captures a baseline,
  dispatches once and polls until a verdict whose `startedAt` moved. Never call `cypress tap run` yourself
  and never put two runs in flight. `cypress run` is for batches, not for the red→green loop.
- The app is shared by every worktree and CI: `https://omnipizza-frontend.onrender.com`
  (API `https://omnipizza-backend.onrender.com`), same deterministic users everywhere. When the environment
  variable `CYLOCK` points to the cross-worktree lock script, wrap every `cypress run` and `pnpm tap:run`:
  `node "$CYLOCK" run -- pnpm cy:run --browser chrome --spec ...` / `node "$CYLOCK" run -- pnpm tap:run <spec>`.
- Render cold start: `curl -s -o /dev/null -w '%{http_code}\n' https://omnipizza-backend.onrender.com/api/countries`
  before a run; if the first request took > 30 s, warm it and retry — never "fix" timeouts in code.
- Windows + Node 24: every `cypress tap` call prints its result and then aborts in libuv teardown
  (exit 0xC0000409, `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`). `scripts/tap.ts` absorbs it
  when stdout is valid JSON — always use `pnpm tap*`, never raw `cypress tap`, in scripts and loops.

## Never

- Never run `cy.prompt` (`--expose UI_STRATEGY=cyPrompt`, `cy-prompt-suite.yml`): billed per execution
  (100/month on the free plan), the owner triggers it personally.
- Never `--record` / `CYPRESS_RECORD_KEY`; never write through Cypress Cloud, TestRail or GitHub APIs;
  never create accounts or enable integrations.
- Never `git push`, never touch `main` or another worktree, never rewrite history, never edit
  `docs/index.html` (a Claude Design export the owner re-exports).

## Agent tooling in this repo

- **Skills** — `.claude/skills/` holds the five official `cypress-io/ai-toolkit` skills as copies (MIT notice in
  `.claude/skills/LICENSE`), so a fresh clone needs no install; `skills-lock.json` pins upstream hashes. Refresh ONLY
  with `pnpm dlx skills add cypress-io/ai-toolkit -a claude-code -s '*' -y --copy` from the repo root, then check
  `find .claude/skills -type l | wc -l` prints 0. Never `skills update`/`skills check` (they swap the copies for
  symlinks into an untracked `.agents/skills/`), never hand-edit a skill. `cypress-tap` is the red→green loop (read
  `npx cypress tap …` as `pnpm tap …`); the other four are aids. **Skills are aids only: Non-negotiables and Never
  above override them.** Ignore `cypress-author`'s "multiple assertions" rule and its cy.prompt guidance: never author
  a `cy.prompt(` call — it lives only in `CyPromptCheckoutUiStrategy` (the `guard-oracle` hook denies it elsewhere).
- **MCP** — `.mcp.json` declares `cypress-cloud` (`https://mcp.cypress.io/mcp`, OAuth via `/mcp`,
  read-only, 100 tool calls/hour) and `github` (remote GitHub MCP, Actions toolset, read-only endpoint,
  `GH_MCP_PAT` env var with Actions: read; unset → Claude Code warns and the server stays unusable, never
  commit a token). Cloud MCP and the Cloud CLI (`cy-cloud`) require separate authentication from
  the Record Key and may need an org admin to enable their integrations. `pnpm cloud:status`
  currently reports `authenticated: false`; recorded runs still work with the Record Key.
- **Subagents** — `@agent-cy-fixer` (red→green through tap; edits steps / strategies / locators only, max 5
  iterations, prints a JSON verdict) and `@agent-cy-triage` (read-only; returns `{category, confidence, evidence[]}`).
- **Hooks** — `.claude/settings.json`: `guard-oracle` (Edit|Write|MultiEdit) denies oracle edits and authored
  `cy.prompt(` calls; `guard-bash` (Bash) denies `UI_STRATEGY=cyPrompt`, `cy-prompt-suite.yml`, `--record` /
  `CYPRESS_RECORD_KEY` and `git push` — both exit 2 with a reason, the rest of "Never" is on you; `after-edit`
  returns typecheck + sibling-test results as `additionalContext`; `audit-mcp` appends every `mcp__cypress-cloud__*`
  / `mcp__github__*` call to `.claude/audit.jsonl` (git-ignored). Demo offline: `echo '<hook json>' | pnpm exec tsx scripts/hooks/<name>.ts`.
