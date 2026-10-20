# Claude Code live-demo prompts

Use these prompts from the repository root in Claude Code. Run one Cypress command at a time. The first and third prompts run locally without `.env` or Cloud recording; the saved Cloud and TestRail runs supply the remote evidence. The repository hooks in `.claude/settings.json` guard protected edits and block agent-issued `--record` and `cy.prompt` commands.

## 1. Let the audience predict the failure

> Read `AGENTS.md`, `agent/README.md`, and the C9 Checkout scenario. Explain the API and UI claims and which files are protected. Then run only C9 locally in Chrome with `MUTATE_DOM=checkout.address`, `retries=0`, no `.env`, and no Cloud recording. Do not edit files. Show the mutation log and the failing selector; distinguish a locator failure from an API or infrastructure failure.

Expected local command:

```powershell
pnpm cy:run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@C9' --expose 'MUTATE_DOM=checkout.address' --config 'retries=0'
```

Pause before the result appears and ask the audience what they expect. The controlled failure should rename `address-desktop` to `address-desktop--renamed-by-demo` while the locator registry still queries the original value.

## 2. Ask for evidence, not a guess

> Diagnose the C9 failure from the local report and screenshot. Compare Cypress Cloud run 9 with run 10 and inspect run 10 Test Replay using the authenticated `cy-cloud` CLI. Quote the DOM rename and the next failed `get` command. Use Cypress Cloud MCP only if it is connected in this host; otherwise identify the CLI as the source. Do not rerun or edit anything during diagnosis.

- [Cloud run 9](https://cloud.cypress.io/projects/5v45hh/runs/9): 12 passed.
- [Cloud run 10 Replay](https://cloud.cypress.io/projects/5v45hh/runs/10/overview/8c0316b3-e4d3-465f-8a6c-b7c6ec8af362/replay): C9 failed after the DOM rename; four other Checkout examples were filtered out.
- [TestRail R8](https://cypressconference2026.testrail.io/index.php?/runs/view/8): 12 passed and closed.
- [TestRail R9](https://cypressconference2026.testrail.io/index.php?/runs/view/9): one failed C9 result and closed.

Cloud CLI authentication is separate from MCP authentication. If the CLI or MCP is unavailable on stage, open the saved links in the browser and name the evidence source accurately.

## 3. Reveal the recovery

> Run only C9 again with the same `MUTATE_DOM=checkout.address`, plus `HEAL_LOCATORS=a11y`, in Chrome with `retries=0`. Do not load `.env`, record to Cloud, or change any file. Show the chosen fallback and the final Cypress result. Compare it with the red run: what changed in configuration, and what stayed the same in the feature and claims?

Expected local command:

```powershell
pnpm cy:run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@C9' --expose 'MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y' --config 'retries=0'
```

A passing result demonstrates the deterministic accessibility fallback for this mutation. It does not establish that `cy.prompt` handles the mutation. If the backend is cold or unreachable, identify that separately and use the saved Cloud evidence for the failure story.
