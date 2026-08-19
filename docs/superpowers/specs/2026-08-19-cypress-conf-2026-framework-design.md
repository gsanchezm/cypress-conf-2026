# cypress-conf-2026 — Atomic Testing Framework Design

**Status:** Approved for implementation (spec reviewed and approved 2026-08-19; Gherkin/README language confirmed as English)
**Date:** 2026-08-19
**Author:** Gilberto (gsanchezm) + Claude (design session)

## 1. Purpose

A Cypress + TypeScript testing framework, built as a conference demo for Cypress Conf 2026, that
proves **automated atomic testing** against a real, independently deployed system (OmniPizza):
every test validates the API contract, hydrates that API-produced state into the UI, and validates
the rendered UI — in one atomic run, with no hidden coupling between "the API suite" and "the UI
suite." The deliverable is a public GitHub repo (`gsanchezm/cypress-conf-2026`) with a working
CI/CD pipeline, built to double as a teaching artifact: every design pattern and principle in it
must earn its place and be explainable in under a minute on stage.

## 2. System Under Test

**OmniPizza** — a QA-training food-ordering platform (see `references/omnipizza.md` for the full
survey). Key facts that drive this design:

- **Frontend**: React/Vite SPA, `https://omnipizza-frontend.onrender.com` (Render free tier — cold
  starts possible).
- **API**: FastAPI, `https://omnipizza-backend.onrender.com`, docs at `/api/docs`,
  OpenAPI at `/api/openapi.json`.
- **Deterministic test users** (password `pizza123` for all): `standard_user`, `locked_out_user`,
  `problem_user`, `performance_glitch_user`, `error_user`, `a11y_glitch_user`,
  `security_glitch_user`.
- **5 markets** (MX/US/CH/JP/SA), each with distinct currency, tax, and **required checkout
  fields**: `colonia` (MX), `zip_code` (US), `plz` (CH), `prefectura` (JP), `district` (SA), plus
  5 differently-named tip fields.
- **Core endpoints**: `/api/auth/*`, `/api/pizzas`, `/api/countries`, `/api/cart*`,
  `/api/store/market`, `/api/checkout`, `/api/orders*`, `/api/session*`.
- Mobile app exists but is **out of scope** — this framework is web-only (Cypress).

## 3. Scope — Vertical Slices

Four vertical slices, each fully implementing the atomic flow (API → hydrate → UI):

1. **Auth & Session** — login across the deterministic user roster, session/token handling.
2. **Market & Catalog i18n** — country selection, per-market pricing/currency/localization,
   catalog rendering.
3. **Cart & Checkout (multi-country)** — cart mutation, checkout with per-country required-field
   and tip validation.
4. **Orders & edge cases (bonus)** — order history, cancel (pending→cancelled), 403/409 negative
   cases, and the deterministic edge-case users (`problem_user`, `a11y_glitch_user`,
   `security_glitch_user`) as an extensibility showcase.

## 4. Principles

| Principle | How it's enforced here |
|---|---|
| **SRP** | `ApiClient`, `UiComponent`, `Factory`, `Strategy`, `Observer` each have exactly one reason to change. |
| **OCP** | New country → new `ValidationStrategy` + one registry line, zero edits elsewhere. New report sink → new `Observer`, zero edits to specs. |
| **LSP** | All `ApiClient` subclasses substitutable via the `BaseApiClient` contract; all strategies substitutable via their shared interface. |
| **ISP** | Small, focused interfaces (`Observer`, `ValidationStrategy`, one `UiStrategy` per business action per slice, `DataFactory<T>`) — no god interface, and explicitly no single app-wide "UI interaction" interface (see §8 — that was tried and rejected). |
| **DIP** | High-level Facades depend on abstractions, not concretions. Concrete wiring happens in one composition root (`cypress/support/e2e.ts`). |
| **DRY** | Shared plumbing centralized in `core/`; rule-of-three applied before extracting anything new. |
| **KISS / YAGNI** | See §6 "Deliberately not built." |
| **LoD** | Specs (step definitions) talk only to a Facade. Never `facade.api.client.http...` chains. |
| **Vertical Slicing** | Folder-per-feature, not folder-per-layer. A slice can be read, demoed, or deleted independently. |

## 5. Design Patterns → Responsibility

| Pattern | Where | Why here |
|---|---|---|
| **Proxy** | `LocatorProxy` wraps `locators/*.json` | Controlled access to selectors: dot-path lookup, caching, throws a clear error on a missing key instead of a silent `undefined` selector. Replaces classic POM. |
| **Template Method** | `BaseApiClient.request()`, `BaseUiComponent.load()`, and **`AtomicScenario`** (the centerpiece — see §7) | Fixes the algorithm skeleton (headers/error-handling; visit/ready-wait; arrange→hydrate→assert order); slices fill in only the specific steps. |
| **Facade** | `AuthFacade`, `CatalogFacade`, `CheckoutFacade`, `OrdersFacade` | One narrow entrypoint per slice (`loginAs()`, `seedCart()`, `placeOrder()`), hides API+data+locator+strategy wiring from step definitions. |
| **Strategy** | (a) `CheckoutValidationStrategy` per country, keyed by `X-Country-Code`. (b) One small `XxxUiStrategy` interface **per business action per slice** (e.g. `CheckoutUiStrategy.completeCheckout(order)`), each with a `Deterministic...` and an `AiPrompt...` implementation (see §8). | (a) 5 genuinely different required-field/tip rules. (b) Lets a step definition invoke the same business action via hardcoded locators or `cy.prompt()` without knowing which — scoped at business-action granularity, not per click/assert, so the interface stays typed and neither implementation needs `any` or a throw-on-unsupported branch. |
| **Factory** | `UserFactory` (deterministic roster + ad-hoc via faker), `PizzaOrderFactory`, `CountryDataFactory` | Centralizes how valid-but-varied test data is built per slice. |
| **Builder** | `CheckoutRequestBuilder` | Checkout payloads have many optional/country-conditional fields — reads better than a Factory with 10 optional args. |
| **Observer** | `ReportingSubject` + `Observer`, wired on `after:spec`/`after:run` in `cypress.config.ts` | Decouples "a spec finished" from "who cares." 3 observers (§9). |
| **Adapter** *(minor, named for honesty)* | Cucumber step-definition layer | Thin adapter between Cucumber's step-matching interface and our Facade interface — not a new subsystem, just an honest name for what step defs already do. |

## 6. Deliberately not built (YAGNI/KISS)

- **Repository layer** — `ApiClient` + `Facade` already cover it; a third layer would be pure indirection.
- **Chain of Responsibility** for checkout validation — folded into `Strategy` (each country strategy composes a few small validator functions internally).
- **Singleton** — `Cypress.env()` is already a single config source; a Singleton class would duplicate it.
- **Command pattern** — no undo/replay requirement exists.
- **Husky/commit hooks** — not needed for a demo repo; easy to add later if the repo outlives the talk.

## 7. The Atomic Flow — `AtomicScenario` (Template Method)

```
1. arrangeViaApi()  → real API call(s) via BaseApiClient; asserts the API contract itself
                       (status, schema, business rule). Always deterministic — cy.prompt
                       cannot do API testing.
2. hydrateUi()       → injects that API-produced state into the browser (token/session,
                       cy.visit), OR performs a business UI action via the slice's active
                       XxxUiStrategy (see §8).
3. assertUi()        → asserts the rendered DOM reflects that state, via the same
                       XxxUiStrategy.
```

Called as `AtomicScenario.for('checkout').run({ arrangeViaApi, hydrateUi, assertUi })`. The order
is enforced by the base class; only the three steps are pluggable per slice. This is the through-line
for the talk: every atomic test, regardless of feature, provably validates the API and the UI in one
run.

**Resilience**: `BaseApiClient` includes a cold-start-aware retry/timeout on the first request of a
run, since both OmniPizza services are live Render free-tier instances — real infra, not mocks.

## 8. Business Layer — Gherkin/Cucumber + AI (`cy.prompt`)

**Gherkin is the primary business-spec layer** for all 4 vertical slices (`@badeball/cypress-cucumber-preprocessor`,
esbuild bundler). `.feature` files are written in **English, pure business language** — no "click,"
"response," "selector," or any technical term. Example:

```gherkin
Feature: Multi-country checkout
  Scenario: Jane completes an order in Mexico with the required details
    Given Jane is logged in as a standard customer in Mexico
    And her cart contains two large pizzas
    When Jane completes the order with her neighborhood (colonia)
    Then the order should reflect the total with Mexico's taxes
```

Step definitions (`src/features/<slice>/steps/*.steps.ts`) translate business language into Facade
calls — never into raw Cypress commands directly. `.cy.ts` files are **not used for business specs**;
they're reserved for internal framework unit tests (e.g., asserting `LocatorProxy` throws on a
missing key).

**`cy.prompt()` placement** (verified against Cypress docs, 2026-08-19 — beta since 15.13.0/current
15.21.0, Cypress Cloud + record key required, Chromium-only, no API testing support, **confirmed to
run in headless `cypress run`**, not just `cypress open`):

**Design correction from the first draft**: a single app-wide `UiInteractionStrategy` interface
doesn't survive contact with both implementations. `DeterministicStrategy` is naturally locator-keyed
(`click('checkout.submit')`); `cy.prompt()` is naturally intent-keyed and takes an *array* of
natural-language steps, batched into one call. Forcing one interface over both means either
`AiPromptStrategy` can't interpret a locator key, or `DeterministicStrategy` needs a second,
parallel intent→locator registry — exactly the kind of interface that only "works" with an `any` or
a branch that throws. The fix: scope the Strategy interface at **business-action granularity**,
matching one Gherkin step, not one click:

```typescript
interface CheckoutUiStrategy {
  completeCheckout(order: CheckoutOrderData): void;
  assertOrderConfirmation(expected: OrderSummary): void;
}
```

- `DeterministicCheckoutUiStrategy` implements this via `LocatorProxy` keys and a `cy.get/type/click`
  sequence internally.
- `AiPromptCheckoutUiStrategy` implements this via **one** batched `cy.prompt([...], { placeholders })`
  call per method, templated from the typed `order`/`expected` data — this also preserves the
  multi-step batching `cy.prompt`'s own docs are built around, which a per-click interface would have
  thrown away.
- Each slice that needs this defines its own small interface (`CheckoutUiStrategy`,
  `CatalogUiStrategy`); there is no forced shared base — consistent with ISP (§4).
- Selected via `Cypress.env('UI_STRATEGY')` (`deterministic` default, `ai` opt-in), resolved once in
  the composition root and injected into Facades (DIP).
- **Local**: works in `cypress open` or headless `cypress run` once logged into Cypress Cloud;
  developers flip `UI_STRATEGY=ai` to see the same `.feature` files execute via natural-language
  prompts instead of `LocatorProxy`.
- **CI**: separate `ai-suite.yml` job, **manual (`workflow_dispatch`) only** — not on every push/PR —
  to avoid burning Cypress Cloud AI quota on every commit. Requires `CYPRESS_RECORD_KEY` (GitHub
  secret, provided by you via `gh secret set`, never pasted in chat) and `--browser chrome`
  (Chromium-only constraint).
- The deterministic suite is what must be green for the talk; the AI suite is an explicit, opt-in
  demonstration layered on top — it never gates the core pipeline.

**Operational limits (verified via Cypress Cloud FAQ, 2026-08-19)** — confirm against your plan
before the demo:
- 100 prompts/hour on free accounts, 600/hour on paid.
- Max 50 steps per single `cy.prompt()` call.
- The no-overage-charge grace period **ended 2026-07-31** — already past as of this spec's date, so
  overage billing may apply. Check your Cypress Cloud plan/quota before relying on this live on stage.
- Selector-cache persistence (disk vs. Cloud-only) is not documented; treat every CI run of
  `ai-suite.yml` as a potentially cold/full-cost AI run, not a cached one.

## 9. Reporting — Observer

Three observers on one `ReportingSubject`, addable/removable with zero spec changes:

- **HtmlReportObserver** — mochawesome, visual report for the room.
- **GithubActionsSummaryObserver** — writes a markdown table to `$GITHUB_STEP_SUMMARY`.
- **ConsoleObserver** — enriched colored console output tagged per pattern/slice executed.

## 10. Folder Structure (Vertical Slicing)

```
cypress-conf-2026/
├── .github/workflows/
│   ├── tests.yml              # deterministic suite: push/PR/workflow_dispatch, matrix per slice
│   └── ai-suite.yml            # cy.prompt suite: workflow_dispatch only
├── cypress/
│   ├── e2e/{auth,catalog,checkout,orders}/*.feature
│   └── support/{e2e.ts, commands.ts}     # composition root (DIP wiring)
├── src/
│   ├── core/
│   │   ├── http/           (BaseApiClient, ApiError)
│   │   ├── ui/              (BaseUiComponent, AtomicScenario)
│   │   ├── locators/        (LocatorProxy)
│   │   ├── types/           (shared contracts: PizzaCatalogItem, CountryConfig, OrderSummary — used
│   │   │                     by 2+ slices; behavior stays slice-owned, only shapes live here)
│   │   └── reporting/       (Observer, ReportingSubject, the 3 observers)
│   └── features/
│       ├── auth/           {api, ui, data, facade, steps, locators/*.json}
│       ├── catalog/        {api, ui, data, facade, steps, strategies, locators/*.json}
│       ├── checkout/       {api, ui, data, facade, steps, strategies, locators/*.json}
│       └── orders/         {api, ui, data, facade, steps, locators/*.json}
├── cypress.config.ts / tsconfig.json / package.json
└── README.md               # architecture walkthrough + pattern map, written for the audience
```

## 11. CI/CD — GitHub Actions

Both apps are already deployed on Render — CI runs the suite against the live URLs, nothing to
build/host.

- **`tests.yml`** (deterministic suite): triggers on `push`/`pull_request` to `main` + `workflow_dispatch`
  (so it can be run live on stage). Matrix strategy: one parallel job per vertical slice
  (`auth`/`catalog`/`checkout`/`orders`) — genuine parallelism from GitHub Actions matrix, no Cypress
  Cloud parallel-run billing needed. Steps: checkout → setup-node (LTS, npm cache) → `npm ci` →
  `cypress run --spec cypress/e2e/<slice>/**` → upload mochawesome + screenshots/videos as artifacts
  on failure → step summary via `GithubActionsSummaryObserver`.
- **`ai-suite.yml`** (AI-assisted suite): `workflow_dispatch` only, `--browser chrome`, needs
  `CYPRESS_RECORD_KEY` secret.

## 12. Implementation Approach (parallelism)

Two different kinds of parallelism, both requested:

1. **Build-time**, three phases:
   a. **Core** (sequential, single worktree): `src/core/` — `BaseApiClient`, `BaseUiComponent`,
      `AtomicScenario`, `LocatorProxy`, shared `types/`, Observer infra. Every slice depends on this.
   b. **Locator harvest** (sequential, before fan-out): the frontend is a client-rendered SPA — its
      `data-testid` values can only be read from a live browser session, not from a static fetch (see
      `references/omnipizza.md`). One pass through the real app (via `cypress open` or browser
      automation) records the actual selectors into each slice's `locators/*.json` and commits them
      *before* slices fork into parallel work — otherwise all 4 parallel agents independently block on
      the same browser-access step, serializing anyway.
   c. **Slices in parallel** (4 worktrees/subagents): auth, catalog, checkout, orders — each depends
      only on core + its own already-harvested locators, not on each other. Any type/shape needed by
      more than one slice (e.g. the pizza/catalog item shape checkout also needs) is added to
      `src/core/types/` *before* the fan-out, not duplicated per-slice or reached-into across slice
      folders. CI workflow, README, and `AiPromptStrategy` wiring are integration steps done last,
      sequentially, after all 4 slices merge.
2. **Run-time**: the `tests.yml` matrix (§11) runs the 4 slices' `.feature` suites in parallel in CI.
   **Verified safe** (2026-08-19, live probe against the API): logging in twice as `standard_user`
   produces two JWTs with distinct `sid` claims and distinct, non-overlapping cart/session state — no
   cross-contamination observed between sessions sharing a username. The 4-way matrix can reuse
   deterministic usernames across parallel jobs without flaking from shared state, since each job
   authenticates its own session.

This section is elaborated into a concrete task breakdown by the implementation plan (next step,
via the `writing-plans` skill).

## 13. Repo & Deliverables

- Public repo `gsanchezm/cypress-conf-2026`, created via `gh repo create` immediately after this
  spec is approved.
- README as detailed as this spec — architecture, pattern map, how to run locally, how to run in CI,
  how to flip `UI_STRATEGY=ai`.
- This spec committed at `docs/superpowers/specs/2026-08-19-cypress-conf-2026-framework-design.md`.

## 14. Open items requiring your input before/at implementation time

- `CYPRESS_RECORD_KEY` — please provide via `gh secret set CYPRESS_RECORD_KEY` yourself (not pasted
  in chat), or tell me to leave `ai-suite.yml` with a placeholder secret name for you to fill in later.
- `CYPRESS_CLOUD_PROJECT_ID` (not secret) — needed in `cypress.config.ts`; please share the project ID
  when ready.
- Confirm your Cypress Cloud plan covers current `cy.prompt` usage — the no-overage-charge grace
  period ended 2026-07-31 (§8); if you're still on the free tier's 100 prompts/hour, that's tight for
  a live, possibly-retried demo run.
- Pinned versions for implementation: `cypress@^15.21.0` (or newer, re-check before implementation
  starts), `@badeball/cypress-cucumber-preprocessor@^26.0.0` — verified compatible 2026-08-19.
