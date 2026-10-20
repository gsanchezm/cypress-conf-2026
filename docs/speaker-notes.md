# Speaker notes — Cypress Conf 2026

This guide follows all 39 slides in [the presentation](index.html). Slide titles remain in English. The suggested lines are written for delivery in English; adapt them to your voice. The operational runbook is at the end so you can keep it open on a second screen. The slides contain no timing estimates, so avoid promising an average duration.

## Prepare before opening the presentation

1. Open the presentation, [interactive agent map](agent-architecture.html), OmniPizza Web, its OpenAPI documentation, the TestRail project, and [Cypress Cloud project 5v45hh](https://cloud.cypress.io/projects/5v45hh). Load the pages in advance so a Render cold start does not interrupt the story.
2. In your editor, open `cypress/e2e/checkout/checkout.feature`, `src/features/checkout/steps/checkout.steps.ts`, `src/core/ui/AtomicScenario.ts`, `src/features/checkout/facade/CheckoutFacade.ts`, `src/features/checkout/prompts/checkout.prompt.md`, `AGENTS.md`, and `agent/README.md`. Use a readable zoom level.
3. Run `pnpm warmup` and `pnpm typecheck`. Check `pnpm cloud:status` and `pnpm cloud:runs`; the CLI was authenticated with a PAT on October 19, 2026. Check separately whether your agent host exposes Cypress Cloud MCP tools before planning a live MCP query. Keep the Cloud web UI ready as a fallback.
4. Hide `.env`, credentials, notifications, and any terminal that might print secrets. Keep the test runner, inspection terminal, and browser in separate windows.
5. Have historical evidence ready: [Cloud run 7](https://cloud.cypress.io/projects/5v45hh/runs/7), [Cloud run 8](https://cloud.cypress.io/projects/5v45hh/runs/8), TestRail R7, and the [deterministic Actions run](https://github.com/gsanchezm/cypress-conf-2026/actions/runs/39306055926). For the current four-case model, open [TestRail R10](https://cypressconference2026.testrail.io/index.php?/runs/view/10): twelve passing scenarios grouped into four results.

## Act 1 — the problem and OmniPizza

### 00 · Opening Video

**Say:** “Let us begin with the film. It starts at 00:36; I will turn on the sound, then continue to the title.”

**Do:** Click the visible Play with sound button. Pause or restart from 00:36 with the two persistent buttons at the upper right. Advance to the title when the clip is finished.

### 01 · Title

**Say:** “In the Green Lantern universe, the ring responds to the will of its bearer. Testing has a similar constraint: if we cannot name the behavior we want to prove, automation cannot save us. Today I will show an architecture in which the API prepares state, the UI proves the user experience, and agents help without changing the oracle.”

**Point out:** The title and “atomic testing.” Establish the promise of a test with a clear purpose before discussing individual tools.

**Transition:** “Before looking at code, let me introduce the real system we will test.”

### 02 · Speaker

**Say:** “I’m Gilberto Sánchez, Mexitester. I work in test automation and software quality. I built this project so you can inspect everything you see: the Cypress repository, the application under test, and the results.”

**Point out:** Your name. Save the links for the closing slide, where the talk repository appears first.

### 03 · Agenda

**Say:** “We will move through four acts: meet OmniPizza, build an atomic scenario, examine the rules, skills, MCP tools, and agent roles, then run the demo with TestRail, a real DOM change, Cypress Cloud, and CI. `cy.prompt` appears inside the demo because it is an execution strategy.”

**Point out:** The four cards in order. Do not assign minutes to the sections.

### 04 · The Problem

**Say:** “Imagine a Checkout test that logs in, browses the catalog, adds a pizza, visits the cart, and finally fills out a form. When it turns red, what broke? It might be the session, an earlier page, a selector, the backend, or the total. The long journey hides the cause.”

**Do:** Walk through the screens verbally. Ask the audience what they would investigate first, then use their answer to introduce isolation.

### 05 · The Oath

**Say:** “The oath is playful, but the technical point is serious: a test becomes precise when we limit what it prepares, executes, and claims. If one scenario tries to prove the whole user journey, one red result tells us too little.”

**Transition:** “To make this concrete, I built a product with variations that challenge the architecture.”

### 06 · OmniPizza

**Say:** “OmniPizza is the system under test. Its frontend and API are deployed independently; it has OpenAPI documentation and five markets. This is not a static page built to make tests pass. Fields, currencies, and reading direction really vary.”

**Do:** Open OmniPizza Web if it has loaded. Show the market selector. If the network is slow, use the slide screenshots and continue; the browser returns in the demo.

### 07 · OmniPizza Desktop

**Say:** “Here is an important constraint. The Checkout form collects address, contact, and payment details. After submission, the app shows the order ID and total. That confirmation page depends on state created by the real user action.”

**Point out:** Checkout and confirmation. An API POST followed by a direct visit to `/order-success` does not rebuild that browser state; return to this limitation on slide 17.

### 08 · OmniPizza Mobile + API

**Say:** “The mobile view shares the backend and business rules. On the right is OpenAPI. Endpoints tagged ‘atomic test setup’ create a session or cart over HTTP, so we can prepare a scenario without clicking through screens we are not testing.”

**Do:** Show the tag in Swagger, without displaying a token or sensitive response. If you open the mobile app, note that Mexico requires a neighborhood and Saudi Arabia a district in an RTL interface.

### 09 · System Architecture

**Say:** “This is the system around the system: GitHub Actions runs Cypress; Cypress talks to the API and browser; TestRail receives results when configured; Cloud receives a run when we choose to record it. If the deterministic pipeline fails, another workflow collects evidence and produces a verdict without calling an LLM.”

**Point out:** Follow the arrows from left to right, then the separate failure path. Here an agent supports inspection or repair; tests do not depend on one to run.

## Act 2 — building an atomic case

### 10 · Anatomy

**Say:** “An atomic test has three properties. It is small because it demonstrates one behavior. It is independent because it does not require another scenario to pass. It uses the API for setup and reserves the browser for what we actually want to observe as a user.”

**Example:** “If I am testing the total on the Checkout confirmation, I do not need to prove every catalog link again in the same scenario.”

### 11 · AtomicScenario

**Say:** “The rule becomes structure rather than advice. `AtomicScenario` runs `arrangeViaApi`, `hydrateUi`, and `assertUi` in that order. First I prepare state and verify the API contract. Then I put the browser in a useful state and perform the necessary action. Finally I inspect what the UI rendered.”

**Do:** If asked where order is enforced, open `src/core/ui/AtomicScenario.ts` and show `runAtomicSteps`. The details for each slice live in its steps and facades.

### 12 · Code: AtomicScenario

**Say:** “This excerpt summarizes Checkout; the real file has more detail. In `arrangeViaApi`, the test logs in through the API, seeds a cart, and places an API order. Its status is the contract claim. In `hydrateUi`, it opens a UI session and submits another order through the real form. These are two distinct orders. In `assertUi`, it compares the rendered confirmation with the expected total derived from the API.”

**Point out:** Each block in order. Do not say the first order’s POST automatically feeds the second order’s success screen.

### 13 · Assertion Budget

**Say:** “The budget is at most two business claims per scenario: one API contract claim and one UI render claim. In Checkout, `assertOrderCreated` verifies the API order status; `assertOrderConfirmation` verifies the visible result. Another business rule deserves another case.”

**Do:** In `CheckoutFacade.ts`, show that a positive total is a precondition and that the visible comparison belongs to the UI strategy.

### 14 · Claims vs Guards

**Say:** “A claim asks, ‘Did the product do the right thing?’ A precondition asks, ‘Is the state needed for this test present?’ A guard waits until the DOM is ready. A failed precondition does not prove a total bug, and a visibility retry does not add a third business claim.”

**Example:** A nonempty token allows the test to continue; it is not the Checkout case’s purpose. A visible field allows interaction; the final total is the behavior being tested.

### 15 · Hydration

**Say:** “Hydration means getting the browser into the state needed for one focused UI check. These four rows show why there is no universal recipe: we choose the shortest path that still reproduces the product behavior under test.”

**Explain the four rows:**

1. **Auth · standard login — pure injection.** The API returns a valid access token. We first visit the app so it initializes its release marker, then put the token in `localStorage` and visit `/catalog`. The browser starts authenticated without repeating the login form; the UI claim is that the customer actually lands on the catalog page. The first visit matters because a fresh app boot can otherwise clear an injected token.
2. **Auth · locked out — real UI.** The API call separately confirms that the locked-out account is rejected with HTTP 403. To prove what a person sees, we submit that account through the real login form and check the specific locked-out message. Putting a token or an error flag in storage would skip the failed interaction and would not show whether the form renders the correct response.
3. **Catalog · five markets — pure injection.** The API selects a market and returns catalog data for the API claim. For the UI, we set the token and the plain `countryCode` storage key after the first visit, then open `/catalog`. On this app's fresh boot, that key drives the client market state and the displayed currency. Changing only the backend market would leave the visible catalog price unchanged, so both sides of the setup matter.
4. **Checkout · five markets — hybrid.** Here we must select the market on the login screen and log in through the real UI, because the Checkout form depends on the app's persisted market state, including its regional field, taxes, and delivery fee. We seed the cart through the API, wait for the browser's cart store to rehydrate, and submit the real form. That submit creates the browser confirmation state needed for the final total check; an API-created order followed by a direct visit to `/order-success` cannot substitute for it.

**Point out:** Follow the rows from least to most UI work. The next slide zooms in on the hybrid Checkout path.

### 16 · Checkout Hydration

**Say:** “Here is the hybrid path: the test logs in through the UI to enter the right market, uses the API to prepare a cart, and lets the browser rehydrate its store. It then fills in address, regional field, and payment, and confirms. Cypress retries DOM readiness conditions; we do not insert an invented fixed delay.”

**Do:** Follow each diagram box to submission. Show where setup ends and the behavior under observation begins.

### 17 · Limits of Injection

**Say:** “We tested the idea of creating the whole order by API and then visiting `/order-success`. The server did create an order, but that page does not refetch the details, and the browser lacks confirmation state. We saw a shell with empty data. That is why the form submission cannot be skipped.”

**Transition:** “We know the boundary. Now let us build a case from requirement to assertion.”

### 18 · Six-Level Case Ladder

**Say:** “I start with Mexico, one row of the `@C8` Checkout outline. The one TestRail case holds all five markets. First, Gherkin states the business rule. Second, `checkout.steps.ts` chooses market data. Third, `AtomicScenario` orders the phases. Fourth, `CheckoutFacade` performs domain actions. Fifth, a strategy operates the UI. Sixth, `assert*` methods own the two claims.”

**Do:** Open `checkout.feature`, point to the scenario-level `@C8`, then to the Mexico `@market_mx` Examples block. Navigate to `runCheckoutScenario` in `checkout.steps.ts`. The `@C` tag maps the result after execution; there is no pre-run `get_case` reader yet.

## Act 3 — agents, boundaries, skills, and MCP

### 19 · Guardrails

**Say:** “`AGENTS.md` is the shared contract. It defines the claim budget, oracle files, and working commands. `guard-oracle` can reject edits to a feature or assertion, while `guard-bash` can reject reserved commands. These scripts are local and deterministic. Each host must wire them into its hooks to enforce them automatically; Claude Code has that wiring.”

**Do:** Show `AGENTS.md` and `scripts/hooks`. Do not claim an assistant without configured hooks blocks edits on its own.

### 20 · Agent Architecture

**Say:** “Read this map from left to right. A person asks for help, an assistant works within repository rules, and the Cypress harness runs against the live OmniPizza API and browser. The branches show guidance and optional capabilities around that path; they do not replace the test runner.”

**Explain the diagram:**

1. **Human → coding agent.** The person chooses the task and authorizes its scope: investigate a failure, repair a test implementation, or inspect evidence. “Coding agent” means any assistant with repository and shell access, not a special service required by the suite. The assistant may propose changes; the versioned tests and their results remain inspectable by the person.
2. **Five Cypress skills and shared roles.** The upward branch is Markdown guidance for tasks such as DOM inspection, Cloud evidence, authoring, explanation, and documentation. The downward branch contains the shared `cy-triage` and `cy-fixer` roles: one diagnoses without editing; the other makes bounded implementation repairs. A skill explains *how* to work, while a role describes *which work* the assistant may perform. Neither executes a test by itself.
3. **Repository rules and guard scripts.** `AGENTS.md` defines the scenario order, claim budget, protected oracle, and working commands. The guard scripts can reject an oracle edit or reserved command when the agent host connects them to its hooks. The dotted arrow matters: declaring a script in the repository is not automatic enforcement in every host. The assistant must follow the shared contract even if its host does not wire the hooks.
4. **Cypress harness → OmniPizza.** `AtomicScenario`, TypeScript, pnpm, and Cypress run the deterministic suite against the real API and Web UI. The harness prepares state, hydrates the browser, and checks the versioned claims. Cypress reports pass or fail; an assistant can explain the evidence but does not decide the result. This path works without an LLM or Cypress Cloud recording.
5. **Optional `cy.prompt` → Cypress Cloud.** The lower branch belongs to test execution, not to the coding agent. If the `cy.prompt` UI strategy is selected, Cypress sends natural-language UI steps during a recorded Cloud run. Cloud supplies that runtime capability and run evidence; the default deterministic strategy uses selectors and does not require it. `cy.prompt` does not change the feature file or authorize a new expected result.

**Do:** Open the [interactive map](agent-architecture.html). Trace the central path first, then point to each branch as you explain it. Use the links in the map to show `AGENTS.md`, the roles, the hooks, and the Cypress strategy if someone asks for the implementation.

### 21 · Official Skills

**Say:** “These five skills are not five bots. They are specialized instructions the assistant can consult for a task. `cypress-tap` inspects the DOM of an open session; `cypress-cloud-cli` inspects runs and Replay; `cypress-author` helps create or repair tests; `cypress-explain` reviews without editing; and `cypress-docs` checks the official documentation.”

**Do:** For each card, answer when to use it, what evidence it provides, and what action it guides. Any assistant with repo access can read these `SKILL.md` files, while Claude Code can also discover them through its adapter.

### 22 · MCP Evidence

**Say:** “Skills tell the assistant how to work. MCP gives it tools for external systems. This repo declares two connections: Cypress Cloud for runs, failures, and Replay links, and read-only GitHub Actions for logs and artifacts. `cy-cloud` is another path to Cloud through the terminal. I verified that the CLI is authenticated and can list runs; that does not prove this host’s MCP connection. TestRail already receives results over HTTP. Its official Cloud MCP is listed as a closed beta and could add case lookup when available.”

**Do:** Show `.mcp.json` without opening `.env`. Point to `cypress-cloud`, `github`, and then `agent/roles/cy-triage.md`: local artifacts first, then Cloud and Actions. If the host exposes the MCP tool, ask for the latest run of project `5v45hh`. Otherwise use `pnpm cloud:runs` and identify it as CLI evidence.

### 23 · Skills vs cy.prompt

**Say:** “The distinction is who receives an instruction and when. A skill guides the assistant writing or diagnosing the framework. `checkout.prompt.md` contains UI steps for the test. `preparePrompt` validates values, and `cy.prompt` uses those steps during a recorded run. Neither changes Gherkin or decides the oracle on its own.”

**Example:** “`cypress-tap` helps me inspect a broken selector. `cy.prompt` tries to perform a Checkout action in the browser.” These are separate layers.

### 24 · Subagents and Graphify

**Say:** “We have two shared roles. `cy-triage` is read-only and returns an evidence-based JSON verdict. `cy-fixer` may edit steps, strategies, or locators for one spec at a time, stopping after five attempts. Graphify helps find dependencies without manually opening hundreds of files. The saved snapshot contains 634 nodes, 1,368 edges, and 24 communities.”

**Do:** If time permits, open `graphify-out/graph.html` and search for `SelectorSource`, `CountryCode`, and `TestResult`. These counts describe a saved local snapshot, not an analysis run on stage.

## Act 4 — live demo and evidence

### 25 · Demo Time

**Say:** “Let Claude Code drive this investigation with us. I will give it the Mexico row of C8 and a boundary: run it locally, show the evidence, and leave the feature and claims untouched. Before we reveal the result, what do you think it will blame when the DOM changes?”

**Do:** First run the brief local baseline in [scene 1](#scene-1--case-identity-and-baseline-run). Then switch to Claude Code in a clean terminal, open `presentation/deck/claude-code-demo.md`, paste its first prompt, and pause for the audience's prediction. Use `@market_mx` so everyone follows one row of C8.

### 26 · Live Demo Route

**Say:** “Claude Code is the guide, not the test runner. It reads the shared rules, chooses the C8 Mexico command, inspects the red result and Replay, then checks the green result after the accessible fallback. Cypress still decides pass or fail. We will finish by comparing the published Cloud and TestRail runs.”

**Do:** Name the Claude Code, Cypress Cloud, and TestRail tabs. Follow `presentation/deck/claude-code-demo.md` and the [demo runbook](#demo-runbook). Cloud 9 / TestRail R8 and Cloud 10 / TestRail R9 are historical evidence from before the parameterized C8 case; the current local demo uses C8 and `@market_mx`.

### 27 · Two Strategies

**Say:** “One Gherkin scenario can use two UI engines. The deterministic strategy uses `LocatorProxy`, selectors, and an optional accessible fallback. The `cy.prompt` strategy uses natural-language steps against the rendered UI and records to Cloud. The step definition does not need to know which engine was selected.”

**Do:** Open `cypress/support/e2e.ts` and show the `UI_STRATEGY` switch. Do not edit the feature during the demo.

### 28 · cy.prompt Basics

**Say:** “For Checkout we batch the order action into one call and confirmation verification into another. A five-market run therefore invokes up to ten `cy.prompt` commands before retries. Recorded run 8 passed all five markets. That proves the current flow; it does not prove healing for the specific DOM mutation we tested with the deterministic path.”

**Do:** Open Cloud run 8. Show the five tests and, if available, a Test Replay timeline.

The slide image was generated from the five real Cypress Cloud CLI results. Slide 32 contains a real screenshot of the Cypress Cloud Runs page supplied by the owner.

### 29 · Prompts as Markdown

**Say:** “The interaction text is not hidden in TypeScript. Here is the Markdown: an address instruction, a placeholder for the regional field, and the confirmation action. Values use double-brace tokens such as `{{address}}`. The target element’s name remains static for each market. `preparePrompt` detects missing placeholders before the call.”

**Do:** Open `checkout.prompt.md`, then `CyPromptCheckoutUiStrategy.ts`. Show `[requiredField]` and how `requiredFieldMX` is inserted. Do not claim a Node test for prompt budget still exists.

### 30 · Demo Backup: Commands

**Say:** “Claude Code can run this controlled comparison one command at a time. The first run renames the live address `data-testid` and fails; the second keeps the mutation but enables `HEAL_LOCATORS=a11y`. Ask it to show the exact mutation log and selector before it calls the result a locator failure.”

**Do:** If Claude Code cannot run a command, use the commands from [scene 2](#scene-2--real-mutation-and-fallback) yourself. Never run them in parallel. The saved Cloud 10 Replay already shows `address-desktop` renamed to `address-desktop--renamed-by-demo` before the original selector fails.

### 31 · TestRail Bulk Reporting

**Say:** “`TestRailObserver` listens at `after:run`. It reads `@C` tags from the feature, creates a run, submits mapped results in one batch, and closes the run: three base requests for the suite. Attaching failure screenshots would add requests. If TestRail is down, the error is logged without turning a passing Cypress run red.”

**Do:** Identify the image as a visualization of historical `get_run/7` and `get_results_for_run/7` API data, not a screenshot of the current TestRail UI. Show current C8 with five examples and [R10](https://cypressconference2026.testrail.io/index.php?/runs/view/10) with one C8 result containing five market statuses. Explain that R7 predates the four-case model.

### 32 · Cloud CLI

**Say:** “Now ask Claude Code to compare two historical recorded executions: run 9 passed all twelve Cypress scenarios; run 10 failed the Mexico scenario, then called C9, after the address attribute changed. That case is now a row of C8. In Replay we can see the rename before the failing `get`. The Record Key, CLI, and MCP use separate authentication; call this CLI evidence unless the host actually used MCP.”

**Do:** The slide's screenshot is historical run 8. Open saved [run 9](https://cloud.cypress.io/projects/5v45hh/runs/9) and [run 10 Replay](https://cloud.cypress.io/projects/5v45hh/runs/10/overview/8c0316b3-e4d3-465f-8a6c-b7c6ec8af362/replay). Ask Claude Code to name the evidence source. Open TestRail R8 and R9 as pre-refactor evidence; do not present their case layout as the current one.

### 33 · CI and Reporting

**Say:** “A push or PR starts `tests.yml`: typecheck, triage unit tests, and the Auth, Catalog, Checkout matrix. The `cy.prompt` workflow is manual. When the deterministic suite fails, `ci-triage.yml` gathers logs and screenshots and produces JSON without an LLM provider. With enough evidence of a flake or cold start it may rerun. Otherwise it may comment on a PR or open an issue with the verdict.”

**Point out:** Trace the failure path in the diagram. The proposed gate that restricts issue publication to confirmed product regressions is not implemented yet.

### 34 · Demo Backup: Results

**Say:** “If conference networking fails, I have historical evidence. A locally recorded Cloud run passed five Checkout tests, and TestRail R7 closed with five passed cases. Another run in Actions and Cloud also passed all five markets. The IDs on screen are verifiable, but they belong to earlier executions.”

**Do:** Open run 8 and the deterministic Actions run. Do not say “we just ran this” when showing a saved record.

### 35 · What the Demo Proves

**Say:** “I want to separate three claims. We have tested the Checkout API and UI flow. We have shown that the deterministic fallback survives the tested `data-testid` mutation. We also know `cy.prompt` completed five markets with the current app. We have not tested whether `cy.prompt` heals that particular mutation. Keeping that boundary makes the demo credible.”

**Do:** Point to “Proven” and “Not yet proven.” Distinguish changing the DOM from changing only the locator file.

## Closing

### 36 · Agentic Boundaries

**Say:** “Today we have TestRail tags, result publishing, the Cypress runner, recorded runs, deterministic triage, and reusable agent roles. Next we could read `get_case` before execution, allow one selected scenario, and publish a bug only for a reproduced business regression with evidence and deduplication. That full sequence is a proposal, not a workflow I can demonstrate today.”

### 37 · Takeaways

**Say:** “Four ideas to take home: use the API to prepare state; use the UI to prove what users see; keep at most one API claim and one UI claim per scenario; and let agents help under verifiable rules. TestRail, Cloud, Graphify, and CI give us evidence to understand failures.”

**Transition:** “The code and app are open so you can challenge these decisions yourself.”

### 38 · Thank You

**Say:** “Thank you. The first link is this talk’s repository; OmniPizza follows. You can review case C8 with its five market examples, run the suite, and explore the interactive diagram. I would especially like to discuss where you would draw the line between API setup and UI action.”

**Do:** Leave the repository, OmniPizza, and contact details visible. Open for questions.

## Demo runbook

These are operational steps. Keep the focus on the Mexico row of `@C8`, and do not start two runs against the shared app at once. Run commands from the repository root in PowerShell. Do not show `.env` on screen.

### Claude Code conductor

Use Claude Code as the audience-facing investigator. Its repository adapter reads `CLAUDE.md`; the shared contract is `AGENTS.md`. The local hooks guard protected edits and reserved commands. Keep Cloud recording and TestRail publication in the prepared human-run records: the Claude Code command hook blocks `--record`, and the local comparison does not load `.env`. `cy.prompt` is a separate Cypress runtime demonstration.

1. **Set the puzzle.** Paste this into Claude Code and let the audience predict the cause before it runs:

   > Read `AGENTS.md`, `agent/README.md`, and the C8 Checkout outline. Explain the API and UI claims and which files are protected. Then run only the `@market_mx` row locally in Chrome with `MUTATE_DOM=checkout.address`, `retries=0`, no `.env`, and no Cloud recording. Do not edit files. Show the mutation log and the failing selector; distinguish a locator failure from an API or infrastructure failure.

2. **Make it show its work.** If the result is the expected selector failure, paste:

   > Diagnose the C8 Mexico row failure from the local report and screenshot. Compare historical Cypress Cloud run 9 with run 10 and inspect run 10 Test Replay using the authenticated `cy-cloud` CLI. Quote the DOM rename and the next failed `get` command. Note that the saved runs used the former C9 ID for Mexico. Use Cypress Cloud MCP only if it is connected in this host; otherwise identify the CLI as the source. Do not rerun or edit anything during diagnosis.

   The saved comparison is [Cloud 9](https://cloud.cypress.io/projects/5v45hh/runs/9) (12 passed) versus [Cloud 10](https://cloud.cypress.io/projects/5v45hh/runs/10) (the former C9 Mexico case failed). TestRail [R8](https://cypressconference2026.testrail.io/index.php?/runs/view/8) and [R9](https://cypressconference2026.testrail.io/index.php?/runs/view/9) also predate the four-case model. The run 10 Replay records `address-desktop` → `address-desktop--renamed-by-demo`, followed by a failed lookup of the original selector.

3. **Reveal the recovery.** Paste this after the audience has seen the evidence:

   > Run only the C8 `@market_mx` row again with the same `MUTATE_DOM=checkout.address`, plus `HEAL_LOCATORS=a11y`, in Chrome with `retries=0`. Do not load `.env`, record to Cloud, or change any file. Show the chosen fallback and the final Cypress result. Compare it with the red run: what changed in configuration, and what stayed the same in the feature and claims?

   Wait for each run to finish before starting the next. If the backend returns 5xx or times out, warm it and identify that as infrastructure evidence; use the saved runs for the selector story. A local green fallback run proves this deterministic fallback only. It does not prove that `cy.prompt` handles this mutation.

### Scene 1 — case identity and baseline run

1. Open C8 in TestRail. Show that one BDD case contains five market examples. Show that Catalog has C3 and Checkout has C8; the old per-market cases are preserved in the Legacy section. Say: “C8 identifies the business case; each Examples row still executes independently in Cypress.”
2. Find scenario-level `@C8` in `checkout.feature`, then the Mexico block tagged `@market_mx`. Read Given, When, and Then. In `checkout.steps.ts`, show `CHECKOUT_SCENARIOS.Mexico` and `runCheckoutScenario`; in `AtomicScenario.ts`, show the three phases.
3. In a clean PowerShell terminal at the repository root, run `pnpm typecheck`. Then execute only the Mexico row locally, without loading `.env` or recording to Cloud:

   ```powershell
   pnpm typecheck
   pnpm cy:run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@market_mx' --config 'retries=0'
   ```

4. Wait for `1 passing` and `4 pending`; the pending rows were filtered out, not executed. Point to “A standard customer completes an order in Mexico.” That is one execution of C8, not a fifth separate TestRail case. If it fails, show whether the failure is in setup, API claim, UI claim, or infrastructure before continuing.
5. For a compact view of all test cases, run the complete local suite without `.env`:

   ```powershell
   pnpm cy:run --browser chrome --spec 'cypress/e2e/**/*.feature'
   ```

   Expect twelve Cypress scenarios across Auth, Catalog, and Checkout, mapped to four TestRail cases: C1, C2, C3, and C8. Wait for one command to finish before starting the next. A local run does not publish TestRail results. Open [R10](https://cypressconference2026.testrail.io/index.php?/runs/view/10) to show the already published full run: four case results, with five market statuses each in C3 and C8.

### Scene 2 — real mutation and fallback

1. Explain the hypothesis: “The locator registry stays unchanged; I rename the `data-testid` in the app’s live DOM.” Run the expected failure:

   ```powershell
   pnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@market_mx' --expose 'MUTATE_DOM=checkout.address' --config 'retries=0'
   ```

2. Wait for completion. Show the locator error in the reporter or screenshot. If the failure was a connection or backend issue, do not label it selector drift. Check the URL and warm the backend before repeating.
3. Run the same mutation with the accessible fallback:

   ```powershell
   pnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@market_mx' --expose 'MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y' --config 'retries=0'
   ```

4. Find the unique alternative selector and final result. Say: “The controlled comparison changed only `HEAL_LOCATORS`; the feature and business claim stayed the same.” If a different failure occurs, follow the evidence and use the prepared screenshots.

### Scene 3 — cy.prompt and Cloud

1. Show the `UI_STRATEGY` switch in `cypress/support/e2e.ts` and the steps in `checkout.prompt.md`. Explain that `cy.prompt` runs inside Cypress, uses Cloud, and is separate from the assistant maintaining the repo.
2. Open [Cloud run 8](https://cloud.cypress.io/projects/5v45hh/runs/8). Show the five markets, one test, and its Replay. This consumes no new `cy.prompt` calls.
3. If you choose to record a new run and have Cloud access, run one market. This command creates a Cloud run and, with TestRail configured in `.env`, may also create a TestRail run:

   ```powershell
   pnpm exec node --env-file=.env node_modules/cypress/bin/cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature --env 'tags=@market_mx' --expose 'UI_STRATEGY=cyPrompt' --record --config 'retries=0'
   ```

4. Wait for and open the new run link. If a service or authentication issue prevents recording, return to run 8. Do not present run 8 as evidence that `cy.prompt` heals `MUTATE_DOM`: that combination has not been tested.

### Scene 4 — TestRail, CLI, MCP, and CI

1. In TestRail, open R10 for the current four-case model. Show the case ID, per-market results, and closed run. R7 is historical evidence from before parameterization. In code, trace `after:run` → `TestRailObserver` → `add_run` → `add_results_for_cases` → `close_run`.
2. Run `pnpm cloud:status` and, if still authenticated, `pnpm cloud:runs`. Open a test or Replay with `cy-cloud`. If the session has expired, use Cloud in the browser. The Record Key, CLI PAT, and MCP authentication are different. If your agent host exposes Cypress Cloud MCP tools, ask it for the latest run in project `5v45hh` and name MCP as the source. If it does not, use the CLI and say so.
3. In GitHub Actions, show `tests.yml`, then `ci-triage.yml`. Say: “The second workflow begins only after the deterministic suite fails. Its base diagnosis comes from logs, not an LLM.” You can show a local classification without writing to GitHub:

   ```powershell
   pnpm triage:verdict src/core/triage/fixtures/checkout-broken-locator.log
   ```

4. Read `category`, `confidence`, and `evidence` in the JSON. One pattern does not prove a product regression. The current workflow may comment or create issues for other categories; the confirmed-bug gate remains proposed work.

### Optional interlude — guardrails, Graphify, and cypress-tap

This fits after slides 19–24 if the tools are already open. It is not required for the main demo.

1. Open `AGENTS.md` and show that the shared contract protects `.feature` files and `assert*` methods. To demonstrate the guard without editing a file, send a fictional Edit proposal to its standard input:

   ```powershell
   '{"tool_name":"Edit","tool_input":{"file_path":"cypress/e2e/auth/auth.feature","old_string":"a","new_string":"b"}}' | pnpm exec tsx scripts/hooks/guard-oracle.ts
   ```

   Expect a rejection with exit code 2. Say: “The script receives an intended edit and rejects it; no test was changed.” It only blocks an agent automatically when the host invokes it as a hook.
2. Open `graphify-out/graph.html` or run a local query:

   ```powershell
   graphify query "CheckoutFacade TestRailObserver"
   ```

   Show one relationship the graph helps you find. If the CLI is unavailable on the presentation machine, use the Archify map from slide 20. Graphify does not run Cypress tests.
3. For `cypress-tap`, start `pnpm cy:open` manually and select E2E in Chrome. Then check `pnpm tap:status`. Only when the session is connected, run `pnpm tap:run cypress/e2e/checkout/checkout.feature`; inspect the reporter, pin, and DOM for the failing command. Do not start another run before the first completes, and do not use this path to rewrite the oracle.

## Recovery paths

| If this happens | Do this | Explain this |
| --- | --- | --- |
| Render is slow or returns 5xx | Run `pnpm warmup`, show screenshots, and return to saved evidence | This is infrastructure; do not weaken a claim or add fixed waits. |
| The C8 Mexico row fails on a precondition | Inspect `arrangeViaApi` or the inaccessible service before trying a fallback | One red scenario does not identify a Checkout bug. |
| No new TestRail run appears | Check whether the run loaded its configuration; show R7 as historical evidence | The observer is opt-in and does not determine the Cypress result. |
| Cloud CLI session has expired | Open run 8 in the browser | The Record Key and CLI authentication are separate. |
| Cypress Cloud MCP tools are absent | Use the authenticated CLI or Cloud UI and name the source | A declared MCP server does not prove this host is connected. |
| A live `cy.prompt` run is not appropriate | Show `checkout.prompt.md`, the strategy, and run 8 | The recorded evidence already demonstrates the five-market flow. |
| Graphify or Archify will not open | Use the slide image and continue verbally | Diagrams support the explanation; they do not run tests. |

## Likely questions

- **“Can this run with Codex, Copilot, DeepSeek, or Claude Code?”** Yes. `AGENTS.md`, `agent/roles`, and the commands are shared. Each host must connect policy scripts for automatic blocking.
- **“What is the difference between a skill and MCP?”** A skill guides how the assistant works. MCP exposes tools to retrieve external evidence. Neither changes the test oracle.
- **“Why not use `cy.prompt` everywhere?”** The deterministic route is the project default. `cy.prompt` adds optional semantic interaction and recorded evidence; it does not replace the Gherkin contract.
- **“Can an agent fix red by changing the expected value?”** That changes the oracle. `cy-fixer` may repair test implementation, not weaken the claim. `guard-oracle` blocks such edits when the host invokes it.
- **“Do the three TestRail requests include screenshots?”** No. They create a run, submit results in bulk, and close it. Screenshot attachments require additional requests.
- **“Does current triage create issues only for confirmed regressions?”** No. That gate is proposed. Today JSON and evidence help classify a failure, but the workflow can publish other categories.

The visual source of truth is [docs/index.html](index.html), generated from `presentation/deck/build.py` and `presentation/deck/deck-base.html`. This guide expands the slide notes; it does not change the projected content.
