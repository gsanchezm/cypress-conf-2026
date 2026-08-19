# cypress-conf-2026 — Atomic Testing Framework Design

**Status:** Approved for implementation
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
| **ISP** | Small, focused interfaces (`Observer`, `ValidationStrategy`, `UiInteractionStrategy`, `DataFactory<T>`) — no god interface. |
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
| **Strategy** | (a) `CheckoutValidationStrategy` per country, keyed by `X-Country-Code`. (b) `UiInteractionStrategy` — `DeterministicStrategy` vs `AiPromptStrategy` (see §8). | (a) 5 genuinely different required-field/tip rules. (b) Lets the same business-language step run via hardcoded locators or `cy.prompt()` without either the step definition or the Facade knowing which. |
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
                       cy.visit), OR performs a business UI action, via the active
                       UiInteractionStrategy.
3. assertUi()        → asserts the rendered DOM reflects that state, via the active
                       UiInteractionStrategy.
```

Called as `AtomicScenario.for('checkout').run({ arrangeViaApi, hydrateUi, assertUi })`. The order
is enforced by the base class; only the three steps are pluggable per slice. This is the through-line
for the talk: every atomic test, regardless of feature, provably validates the API and the UI in one
run.

**Resilience**: `BaseApiClient` includes a cold-start-aware retry/timeout on the first request of a
run, since both OmniPizza services are live Render free-tier instances — real infra, not mocks.

## 8. Business Layer — Gherkin/Cucumber + AI (`cy.prompt`)

**Gherkin is the primary business-spec layer** for all 4 vertical slices (`@badeball/cypress-cucumber-preprocessor`,
esbuild bundler). `.feature` files are written in **Spanish, pure business language** — no "click,"
"response," "selector," or any technical term. Example:

```gherkin
Característica: Checkout multi-país
  Escenario: Jane completa un pedido en México con los datos requeridos
    Dado que Jane inició sesión como cliente estándar en México
    Y su carrito contiene dos pizzas grandes
    Cuando Jane completa el pedido con su colonia
    Entonces el pedido debe reflejar el total con impuestos de México
```

Step definitions (`src/features/<slice>/steps/*.steps.ts`) translate business language into Facade
calls — never into raw Cypress commands directly. `.cy.ts` files are **not used for business specs**;
they're reserved for internal framework unit tests (e.g., asserting `LocatorProxy` throws on a
missing key).

**`cy.prompt()` placement** (verified against Cypress docs — beta since 15.13.0, Cypress Cloud +
record key required, Chromium-only, no API testing support):

- Implemented as `AiPromptStrategy`, one of two `UiInteractionStrategy` implementations selected via
  `Cypress.env('UI_STRATEGY')` (`deterministic` default, `ai` opt-in), resolved once in the
  composition root and injected into Facades (DIP).
- **Local**: works in `cypress open` once logged into Cypress Cloud; developers flip `UI_STRATEGY=ai`
  to see the same `.feature` files execute via natural-language prompts instead of `LocatorProxy`.
- **CI**: separate `ai-assisted` job in the GitHub Actions workflow, **manual (`workflow_dispatch`)
  only** — not on every push/PR — to avoid burning Cypress Cloud AI quota on every commit. Requires
  `CYPRESS_RECORD_KEY` (GitHub secret, provided by you via `gh secret set`, never pasted in chat) and
  `--browser chrome` (Chromium-only constraint).
- The deterministic suite is what must be green for the talk; the AI suite is an explicit, opt-in
  demonstration layered on top — it never gates the core pipeline.

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
│   │   ├── strategies/      (UiInteractionStrategy, DeterministicStrategy, AiPromptStrategy)
│   │   └── reporting/       (Observer, ReportingSubject, the 3 observers)
│   └── features/
│       ├── auth/           {api, ui, data, facade, steps, locators/*.json}
│       ├── catalog/        {api, ui, data, facade, steps, locators/*.json}
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

1. **Build-time**: `src/core/` (BaseApiClient, BaseUiComponent, AtomicScenario, LocatorProxy,
   Observer infra, `UiInteractionStrategy` + `DeterministicStrategy`) is built first, sequentially —
   every slice depends on it. Once core is in place, the 4 vertical slices are implemented **in
   parallel**, each in its own git worktree/subagent, since they don't depend on each other. CI
   workflow, README, and `AiPromptStrategy` wiring are integration steps done last, sequentially.
2. **Run-time**: the `tests.yml` matrix (§11) runs the 4 slices' `.feature` suites in parallel in CI.

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
