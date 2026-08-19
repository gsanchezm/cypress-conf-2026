# cypress-conf-2026

An atomic-testing framework built for Cypress Conf 2026, testing a real, independently deployed
system — [OmniPizza](https://gsanchezm.github.io/OmniPizza/) — end to end. Every test proves the API
contract, hydrates that API-produced state into the UI, and asserts the rendered DOM, all in one
atomic run: no hidden coupling between "the API suite" and "the UI suite."

- **Frontend under test:** https://omnipizza-frontend.onrender.com
- **API under test:** https://omnipizza-backend.onrender.com (`/api/docs` for Swagger)

## Status

| Slice | Status |
|---|---|
| Core framework (`AtomicScenario`, `BaseApiClient`, `BaseUiComponent`, `LocatorProxy`, Observer reporting) | ✅ Done |
| Auth & Session | ✅ Done |
| Market & Catalog i18n (5 markets: MX/US/CH/JP/SA) | ✅ Done |
| Cart & Checkout (multi-country) | ⏳ Not started — needs a live-app harvest first (see below) |
| Orders & edge cases | ⏳ Not started |
| `cy.prompt` suite (`UI_STRATEGY=cyPrompt`) | ⏳ Not started — depends on Checkout |

The description above is the framework's design contract, not a live status claim — Auth and Catalog
have both run green against the real app; the most recent local run predates a since-discovered
environment issue (this workstation's outbound HTTPS to the OmniPizza hosts is currently broken,
unrelated to the framework code) and hasn't been re-verified since.

Checkout and Orders are deliberately not scaffolded ahead of a live harvest: route names,
form-submission flow, and exact API field values are verified against the real running app before any
code is written against them, never guessed.

## Architecture

Vertical slicing, not layered folders — each slice under `src/features/<slice>/` is independently
readable, demoable, and deletable:

```
cypress/
├── e2e/{auth,catalog}/*.feature      # Gherkin - pure business language, no "click"/"selector"/"API"
├── unit/*.cy.ts                       # internal framework tests, not business specs
└── support/e2e.ts                     # composition root (browser-side DIP wiring)
src/
├── core/
│   ├── http/        BaseApiClient, ApiError
│   ├── ui/           BaseUiComponent, AtomicScenario
│   ├── locators/      LocatorProxy
│   ├── types/         shared contracts used by 2+ slices
│   ├── config/         shared constants (e.g. localStorage keys)
│   └── reporting/      Observer, ReportingSubject, ConsoleObserver, GithubActionsSummaryObserver
└── features/
    ├── auth/      {api, facade, data, steps, locators/*.json}
    └── catalog/   {api, facade, steps, locators/*.json}
```

### The atomic flow — `AtomicScenario`

Every scenario runs the same three steps, in this order, enforced by a Template Method:

```
1. arrangeViaApi()  → real API call(s) via BaseApiClient - asserts the API contract itself
                       (status, schema, business rule).
2. hydrateUi()       → injects that API-produced state into the browser (token/session, cy.visit).
3. assertUi()        → asserts the rendered DOM reflects that state.
```

```typescript
AtomicScenario.for('catalog').run({ arrangeViaApi, hydrateUi, assertUi });
```

### Pattern map

| Pattern | Where | Why here |
|---|---|---|
| **Proxy** | `LocatorProxy` wraps `locators/*.json` | Dot-path selector lookup with caching; throws a clear error on a missing key instead of a silent `undefined`. Replaces classic POM. |
| **Template Method** | `BaseApiClient.request()`, `BaseUiComponent.load()`, `AtomicScenario` | Fixes the algorithm skeleton; slices fill in only the specific steps. |
| **Facade** | `AuthFacade`, `CatalogFacade` | One narrow entrypoint per slice, hides API+data+locator wiring from step definitions. |
| **Factory** | `UserFactory` (deterministic roster, loaded from `deterministicUsers.json`) | Centralizes how test data is built per slice. |
| **Observer** | `ReportingSubject` + `Observer`, wired on `after:spec` | Decouples "a spec finished" from "who cares" — `ConsoleObserver` and `GithubActionsSummaryObserver` are both genuine subscribers; mochawesome is wired as Cypress's native `reporter` config, not a third Observer. |
| **Adapter** *(minor)* | Cucumber step-definition layer | Thin adapter between Cucumber's step matching and our Facade interface. |

**Deliberately not built** (YAGNI/KISS): a Repository layer (`ApiClient` + `Facade` already cover it),
Singleton (`Cypress.env()` is already a single config source), Command (no undo/replay requirement),
and Chain of Responsibility for checkout validation (folds into per-country `Strategy` classes once
Checkout exists).

## Running locally

```bash
npm install
npm run typecheck        # tsc --noEmit
npm run test:unit:node    # framework-internal Node unit tests (Observer, etc.)
npm run cy:open            # interactive runner
npm run cy:run              # headless, all specs
npx cypress run --spec cypress/e2e/auth/**       # one slice
npx cypress run --spec cypress/e2e/catalog/**
```

Both `omnipizza-frontend`/`omnipizza-backend` are live Render free-tier deploys — no local server to
start. Render free tier can cold-start on the first request of a run; `BaseApiClient` gives the first
request extra timeout headroom for this.

## Running in CI

`.github/workflows/tests.yml` runs the deterministic suite on `push`/`pull_request` to `main` and on
`workflow_dispatch`. One matrix job per vertical slice with a live `.feature` spec — adding a slice is
a one-line matrix edit, no other CI changes. Mochawesome reports, screenshots, and videos upload as
artifacts; a per-slice results table is appended to the run's job summary automatically via
`GithubActionsSummaryObserver`.

The `cy.prompt` suite (`UI_STRATEGY=cyPrompt`, `workflow_dispatch`-only, needs a `CYPRESS_RECORD_KEY`
secret) will be added once the Checkout slice's `CyPromptCheckoutUiStrategy` exists — see Status above.

## Reporting

- **Console** — enriched, colored, per-slice output during `cypress run` (`ConsoleObserver`).
- **GitHub Actions job summary** — a markdown table written to `$GITHUB_STEP_SUMMARY`
  (`GithubActionsSummaryObserver`), local no-op outside CI.
- **HTML/JSON** — `mochawesome`, wired as Cypress's native `reporter` (`cypress.config.ts`), written to
  `cypress/reports/mochawesome/` (gitignored).
