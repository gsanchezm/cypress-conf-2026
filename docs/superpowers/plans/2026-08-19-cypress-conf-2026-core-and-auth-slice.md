# cypress-conf-2026 — Core Framework + Auth Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the framework's core abstractions (Proxy/Template Method/Observer) and ship one
fully green vertical slice (Auth & Session) end to end against the real OmniPizza app, proving the
architecture before the remaining 3 slices are fanned out into parallel worktrees.

**Architecture:** Cypress + TypeScript + `@badeball/cypress-cucumber-preprocessor`. Business specs
are Gherkin `.feature` files; step definitions are thin adapters that call one Facade per slice.
Framework internals (`LocatorProxy`, `BaseApiClient`, `BaseUiComponent`, `AtomicScenario`, the
Observer reporting pair) are built and unit-tested first, in isolation from OmniPizza specifics, so
slice work only has to wire real data into already-proven mechanics.

**Tech Stack:** TypeScript, Cypress ^15.21.0, `@badeball/cypress-cucumber-preprocessor` ^26.0.0 with
`@bahmutov/cypress-esbuild-preprocessor`, mochawesome (HTML reporting), Node's built-in `node:test` +
`tsx` (for the two Node-only observer classes — justified in Global Constraints), npm.

**Spec:** `docs/superpowers/specs/2026-08-19-cypress-conf-2026-framework-design.md` (read this in full
before starting — this plan implements its §§1–12 partially; §13–14 and the AI/Gherkin-per-slice work
beyond Auth are deferred to a follow-up plan, see "Scope Cut" below).

## Scope Cut — why this plan stops at Task 10

The spec's 4 vertical slices (Auth, Catalog, Checkout, Orders) are meant to fan out into parallel git
worktrees (spec §12). But 3 of those slices depend on facts that don't exist yet:
- Real `data-testid` selectors — the frontend is a client-rendered SPA, unreadable by static fetch.
- The real key OmniPizza's frontend uses to persist the auth token in `localStorage`.
- The cause of the cart/market-scoping quirk (`docs/superpowers/specs/references/omnipizza.md`) —
  needed before Checkout's assertions can be written correctly.
- Whether `cy.prompt()` can navigate the SPA's routing reliably — needed before `CyPromptCheckoutUiStrategy`.

Writing full no-placeholder TDD code for Catalog/Checkout/Orders now would mean inventing selector
values that don't exist. Instead: this plan builds the core framework, harvests only what the **Auth**
slice needs (a small, scoped harvest — not all 4 slices' selectors at once), and ships Auth fully
green as the architecture-proving milestone. **A second plan**, written after this one executes,
covers Catalog/Checkout/Orders (with their own harvest step before their 3-way parallel fan-out, per
spec §12b) and CI/README/`cy.prompt` (spec §11, §13, §14).

## Global Constraints

- **Two composition roots, not one** (spec §4 DIP row, corrected): browser-side collaborators
  (Facades, `LocatorProxy` instances, UI strategies) are wired in `cypress/support/e2e.ts`. Node-only
  collaborators (anything importing `node:fs` or other Node built-ins) are wired in
  `cypress.config.ts`'s `setupNodeEvents`. **Never import `node:fs` (or any `node:*` module) into a
  file reachable from `cypress/support/e2e.ts` or any `.cy.ts`/`.steps.ts` file** — the browser
  bundler will fail or silently stub it.
- **`.cy.ts` files are framework unit tests only**, run in the browser context via Cypress's own
  Mocha+Chai+Sinon (no extra test framework dependency for these). They live under `cypress/unit/`.
  Business specs are `.feature` files under `cypress/e2e/<slice>/`, never `.cy.ts`.
- **Node-only code (the two custom Observers) is tested with `node:test` + `tsx`**, not `.cy.ts` —
  justified because `node:fs`-importing code cannot run inside a Cypress browser bundle at all, so
  there is no way to TDD it through Cypress's own runner. This is the one test-tooling addition beyond
  what spec §6 already lists as deliberately-not-built; it exists because the alternative (an
  untested Node-only class) isn't acceptable, not because a second test runner is convenient.
- Gherkin `.feature` files are **English, pure business language** — no "click," "response,"
  "selector," "API," or any technical term (spec §8). If a step's *implementation* differs by
  scenario (e.g. API-seeded vs. real-form-submission), that choice is invisible in the feature file —
  it lives entirely inside the step definition.
- **LoD**: step definitions call a Facade method and nothing else — never `cy.get()`, never a
  `LocatorProxy` or API client directly.
- Versions: `cypress@^15.21.0`, `@badeball/cypress-cucumber-preprocessor@^26.0.0` — verified
  peer-compatible 2026-08-19 (spec §14). Re-run the `npm view` checks in Task 1 Step 1 before
  installing, in case newer versions shipped since. **`typescript@^5.9.3`** — deliberately *not*
  latest (`7.0.2`, a very recent native-rewrite major version as of 2026-08-19): pinning to the last
  stable 5.x line avoids unknown tooling-compatibility risk with Cypress/esbuild this close to a live
  demo. `5.9.3` was confirmed to actually exist on the registry (an earlier draft of this plan cited
  `5.7.0`, which doesn't).
- `package.json` uses `"type": "module"`. **TypeScript module resolution is `"module": "ESNext"` +
  `"moduleResolution": "bundler"`, not `"NodeNext"`/`"NodeNext"`.** Verified directly: with
  `"type": "module"` + `NodeNext` resolution, `tsc` rejects every extensionless relative import in
  this plan's own code (`TS2835`) — confirmed by actually running it. `bundler` resolution compiles
  the same code cleanly, and is the architecturally correct choice regardless, since esbuild (not
  Node's native ESM loader) is what actually resolves these imports for Cypress.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`
- Create: empty directories `cypress/e2e`, `cypress/unit`, `cypress/support`, `src/core`, `src/features`

**Interfaces:**
- Produces: a working `npm install`, `npx tsc --noEmit` (passes on an empty `src/`), `npx cypress version` (prints installed version) — these are the task's pass/fail checks, since there's no application code yet to unit-test.

- [ ] **Step 1: Resolve current package versions**

Run each of these and note the resolved version (they may have shipped newer than what's below since
2026-08-19):

```bash
npm view cypress version
npm view @badeball/cypress-cucumber-preprocessor version peerDependencies
npm view @bahmutov/cypress-esbuild-preprocessor version
npm view esbuild version
npm view mochawesome version
npm view tsx version
npm view typescript version
```

Confirm the resolved `cypress` version satisfies the `cypress-cucumber-preprocessor` peer range
before continuing (spec §14 verified `15.21.0` against `^15.18.0` — if either has moved, redo that
compatibility check the same way: does the cypress version fall inside the peer range's semver?).

- [ ] **Step 2: Initialize package.json**

```bash
npm init -y
```

Edit `package.json` — set `"type": "module"` and replace `"scripts"` with:

```json
{
  "type": "module",
  "scripts": {
    "cy:open": "cypress open",
    "cy:run": "cypress run",
    "test:unit:node": "node --import tsx --test \"src/core/**/*.node.test.ts\"",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: Install dependencies**

Using the versions resolved in Step 1:

```bash
npm install --save-dev cypress@^15.21.0 typescript@^5.9.3 @badeball/cypress-cucumber-preprocessor@^26.0.0 @bahmutov/cypress-esbuild-preprocessor esbuild mochawesome tsx @types/node
```

(`@bahmutov/cypress-esbuild-preprocessor` is a separate package from the preprocessor itself — both
are required; the preprocessor emits Gherkin-derived specs, the bundler compiles the TypeScript.)

- [ ] **Step 4: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["cypress", "node"]
  },
  "include": ["src", "cypress"]
}
```

(`moduleResolution: "bundler"` — not `"NodeNext"` — is required here: with `"type": "module"` in
`package.json`, `NodeNext` resolution rejects every extensionless relative import
(`import { X } from '../foo'`, without a `.js` suffix) with `TS2835`, and this plan's code uses
extensionless imports throughout, matching what esbuild — the actual bundler resolving these for
Cypress — expects.)

- [ ] **Step 5: .gitignore**

```
node_modules/
cypress/reports/
cypress/videos/
cypress/screenshots/
dist/
```

- [ ] **Step 6: Create folder skeleton**

```bash
mkdir -p cypress/e2e cypress/unit cypress/support src/core/http src/core/ui src/core/locators src/core/types src/core/reporting src/core/config src/features/auth/api src/features/auth/data src/features/auth/facade src/features/auth/steps src/features/auth/locators
```

- [ ] **Step 7: Verify the toolchain**

```bash
npx tsc --noEmit
npx cypress version
```

Expected: `tsc` exits 0 (nothing to check yet, but confirms the config parses). `cypress version`
prints Cypress `15.21.0` (or whatever Step 1 resolved) plus Electron/Node versions.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore
git commit -m "Scaffold cypress-conf-2026 project (npm, TypeScript, Cypress, folder skeleton)"
```

---

### Task 2: Wire cypress.config.ts (Cucumber preprocessor + esbuild + mochawesome)

**Files:**
- Create: `cypress.config.ts`
- Create: `cypress/e2e/smoke/smoke.feature`
- Create: `src/features/smoke/steps/smoke.steps.ts` (deleted at the end of this task once it's proven config works — see Step 7)
- Create: `cypress/unit/smoke.cy.ts` (also deleted at the end of Step 7)

**Interfaces:**
- Produces: `cypress.config.ts` exporting a config whose `e2e.specPattern` matches both `cypress/e2e/**/*.feature` and `cypress/unit/**/*.cy.ts`, `env.apiUrl = 'https://omnipizza-backend.onrender.com'`, `e2e.baseUrl = 'https://omnipizza-frontend.onrender.com'`.

- [ ] **Step 1: Read the installed preprocessor's current API before writing config**

```bash
cat node_modules/@badeball/cypress-cucumber-preprocessor/README.md | head -150
```

Confirm the exact `addCucumberPreprocessorPlugin` and `createEsbuildPlugin` import paths and the
`setupNodeEvents` wiring shape shown there — the shape below matches the documented pattern as of
`^26.0.0`, but if the installed README shows a different signature, use the installed one; the README
is the source of truth, not this plan.

- [ ] **Step 2: Write a smoke .feature file (to prove wiring, deleted in Step 7)**

`cypress/e2e/smoke/smoke.feature`:

```gherkin
Feature: Smoke
  Scenario: Config wiring works
    Given a placeholder step
```

`src/features/smoke/steps/smoke.steps.ts`:

```typescript
import { Given } from '@badeball/cypress-cucumber-preprocessor';

Given('a placeholder step', () => {
  expect(true).to.equal(true);
});
```

- [ ] **Step 3: Write cypress.config.ts**

```typescript
import { defineConfig } from 'cypress';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';

export default defineConfig({
  e2e: {
    baseUrl: 'https://omnipizza-frontend.onrender.com',
    specPattern: ['cypress/e2e/**/*.feature', 'cypress/unit/**/*.cy.ts'],
    supportFile: 'cypress/support/e2e.ts',
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on('file:preprocessor', createBundler({ plugins: [createEsbuildPlugin(config)] }));
      return config;
    },
  },
  env: {
    apiUrl: 'https://omnipizza-backend.onrender.com',
  },
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports/mochawesome',
    overwrite: false,
    html: true,
    json: true,
  },
});
```

- [ ] **Step 4: Configure the cucumber preprocessor's step-definition glob**

Add to `package.json` (top level, per the preprocessor's documented config key — confirm this key
name against the Step 1 README too). **Do not use the `[filepath]` token** — for a feature at
`cypress/e2e/auth/auth.feature` it resolves to `auth/auth` (project root and the `cypress/e2e`
integration folder are stripped, giving the full remaining path, not just the leaf folder name), so
`src/features/[filepath]/steps/*.steps.ts` would look for
`src/features/auth/auth/steps/*.steps.ts` — never matching this plan's actual
`src/features/<slice>/steps/*.steps.ts` layout. A static glob avoids the token entirely and matches
every slice's step folder directly:

```json
{
  "cypress-cucumber-preprocessor": {
    "stepDefinitions": ["src/features/**/steps/*.steps.ts"]
  }
}
```

- [ ] **Step 5: Create the (currently empty) composition root**

`cypress/support/e2e.ts`:

```typescript
export {};
```

- [ ] **Step 6: Add a trivial cypress/unit smoke spec**

`cypress/unit/smoke.cy.ts`:

```typescript
describe('smoke', () => {
  it('runs a plain assertion with no app interaction', () => {
    expect(1 + 1).to.equal(2);
  });
});
```

- [ ] **Step 7: Run both smoke specs, confirm green, then delete the smoke fixtures**

```bash
npx cypress run --spec "cypress/e2e/smoke/smoke.feature,cypress/unit/smoke.cy.ts"
```

Expected: both pass (2 total tests). Once confirmed:

```bash
rm -rf cypress/e2e/smoke src/features/smoke cypress/unit/smoke.cy.ts
```

(These existed only to prove the Cucumber+esbuild+unit-spec wiring works end to end before real
code depends on it — keeping them would leave dead fixtures in the repo.)

- [ ] **Step 8: Commit**

```bash
git add cypress.config.ts package.json cypress/support/e2e.ts
git commit -m "Wire Cucumber preprocessor, esbuild bundler, and mochawesome reporter"
```

---

### Task 3: Core shared types

**Files:**
- Create: `src/core/types/index.ts`

**Interfaces:**
- Produces: `AuthSession` — the only shared type Tasks 1–10 actually consume.

Earlier drafts of this plan also defined `CountryCode`, `PizzaCatalogItem`, `CartItem`,
`CheckoutOrderData`, and `OrderSummary` here — speculatively, for the Catalog/Checkout/Orders slices
this plan explicitly defers (see "Scope Cut"). Nothing in Tasks 1–10 imports them, and cross-checking
them against the live `/api/openapi.json` surfaced real mismatches (`CartItem` only requires
`pizza_id`/`quantity`, not `itemId`/`size`/`toppings`; `OrderSummary` also requires `tax_rate`,
`tip_percentage`, `currency_symbol`). Rather than ship types nothing here uses and that don't match
the real API, they're cut from this plan — the follow-up plan defines them fresh against the verified
schemas now recorded in `docs/superpowers/specs/references/omnipizza.md`.

- [ ] **Step 1: Write the type**

```typescript
export interface AuthSession {
  accessToken: string;
  tokenType: 'bearer';
  username: string;
  behavior: string;
}
```

This file has no runtime logic, so there is no `.cy.ts`/`.node.test.ts` for it — its correctness is
checked by every later task that imports and uses it, compiling under `strict: true`.

- [ ] **Step 2: Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/core/types/index.ts
git commit -m "Add core shared type contracts"
```

---

### Task 4: LocatorProxy (Proxy pattern)

**Files:**
- Create: `src/core/locators/LocatorProxy.ts`
- Test: `cypress/unit/locatorProxy.cy.ts`

**Interfaces:**
- Produces: `class LocatorProxy { constructor(tree: LocatorTree); get(dotPath: string): string }` — every later slice constructs one of these from its `locators/*.json` file and calls `.get('a.b.c')` to resolve a selector.

- [ ] **Step 1: Write the failing test**

`cypress/unit/locatorProxy.cy.ts`:

```typescript
import { LocatorProxy } from '../../src/core/locators/LocatorProxy';

describe('LocatorProxy', () => {
  const proxy = new LocatorProxy({
    login: { usernameInput: '[data-testid="login-username"]' },
  });

  it('resolves a nested dot-path key to its selector string', () => {
    expect(proxy.get('login.usernameInput')).to.equal('[data-testid="login-username"]');
  });

  it('throws a clear error for a key that has no registered selector', () => {
    expect(() => proxy.get('login.missingKey')).to.throw(
      'LocatorProxy: no selector registered for key "login.missingKey"',
    );
  });

  it('caches a resolved key so repeated lookups do not re-walk the tree', () => {
    const first = proxy.get('login.usernameInput');
    const second = proxy.get('login.usernameInput');
    expect(first).to.equal(second);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npx cypress run --spec cypress/unit/locatorProxy.cy.ts
```

Expected: FAIL — `Cannot find module '../../src/core/locators/LocatorProxy'`.

- [ ] **Step 3: Implement LocatorProxy**

`src/core/locators/LocatorProxy.ts`:

```typescript
export type LocatorTree = { [key: string]: string | LocatorTree };

export class LocatorProxy {
  private readonly cache = new Map<string, string>();

  constructor(private readonly tree: LocatorTree) {}

  get(dotPath: string): string {
    const cached = this.cache.get(dotPath);
    if (cached !== undefined) return cached;

    const value = dotPath
      .split('.')
      .reduce<string | LocatorTree | undefined>(
        (node, key) => (typeof node === 'object' && node !== null ? node[key] : undefined),
        this.tree,
      );

    if (typeof value !== 'string') {
      throw new Error(`LocatorProxy: no selector registered for key "${dotPath}"`);
    }

    this.cache.set(dotPath, value);
    return value;
  }
}
```

- [ ] **Step 4: Run it, confirm it passes**

```bash
npx cypress run --spec cypress/unit/locatorProxy.cy.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/locators/LocatorProxy.ts cypress/unit/locatorProxy.cy.ts
git commit -m "Add LocatorProxy (Proxy pattern for JSON-backed locators)"
```

---

### Task 5: BaseApiClient + ApiError (Template Method)

**Files:**
- Create: `src/core/http/BaseApiClient.ts`
- Create: `src/core/http/ApiError.ts`
- Test: `cypress/unit/baseApiClient.cy.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; body: unknown }`
  - `abstract class BaseApiClient { protected abstract readonly basePath: string; protected requestRaw(options): Cypress.Chainable<Cypress.Response<unknown>>; protected request<T>(options): Cypress.Chainable<T> }`
  - `interface ApiRequestOptions { method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'; path: string; body?: unknown; headers?: Record<string,string> }`
- Consumes: `Cypress.env('apiUrl')` (set in Task 2's `cypress.config.ts`).

- [ ] **Step 1: Write the failing test**

Uses a minimal concrete subclass and `cy.intercept` so this test has no dependency on the real
OmniPizza API — it only proves `BaseApiClient`'s own skeleton (URL building, success passthrough,
error throwing).

`cypress/unit/baseApiClient.cy.ts`:

```typescript
import { BaseApiClient } from '../../src/core/http/BaseApiClient';
import { ApiError } from '../../src/core/http/ApiError';

class TestApiClient extends BaseApiClient {
  protected readonly basePath = '/api/test';

  fetchThing(): Cypress.Chainable<{ ok: true }> {
    return this.request<{ ok: true }>({ method: 'GET', path: '/thing' });
  }

  fetchFailingThing(): Cypress.Chainable<unknown> {
    return this.request({ method: 'GET', path: '/failing' });
  }
}

describe('BaseApiClient', () => {
  it('builds the URL from apiUrl + basePath + path and returns the parsed body on success', () => {
    cy.intercept('GET', 'https://omnipizza-backend.onrender.com/api/test/thing', {
      statusCode: 200,
      body: { ok: true },
    }).as('thing');

    const client = new TestApiClient();
    client.fetchThing().then((body) => {
      expect(body).to.deep.equal({ ok: true });
    });
    cy.wait('@thing');
  });

  it('throws ApiError with the response status and body on a 4xx/5xx response', () => {
    cy.intercept('GET', 'https://omnipizza-backend.onrender.com/api/test/failing', {
      statusCode: 401,
      body: { detail: 'nope' },
    }).as('failing');

    const client = new TestApiClient();
    let caught: ApiError | undefined;
    cy.wrap(null).then(() =>
      client.fetchFailingThing().then(
        () => {
          throw new Error('expected fetchFailingThing to throw');
        },
        (err) => {
          caught = err as ApiError;
        },
      ),
    );
    cy.wrap(null).then(() => {
      expect(caught).to.be.instanceOf(ApiError);
      expect(caught?.status).to.equal(401);
      expect(caught?.body).to.deep.equal({ detail: 'nope' });
    });
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npx cypress run --spec cypress/unit/baseApiClient.cy.ts
```

Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement ApiError and BaseApiClient**

`src/core/http/ApiError.ts`:

```typescript
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

`src/core/http/BaseApiClient.ts`:

```typescript
import { ApiError } from './ApiError';

export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export abstract class BaseApiClient {
  protected abstract readonly basePath: string;

  // Returns the raw response (never throws on 4xx/5xx) - for the rare case
  // where a test needs to assert on an expected failure response itself
  // (e.g. asserting a 401 body), rather than treating failure as exceptional.
  protected requestRaw(options: ApiRequestOptions): Cypress.Chainable<Cypress.Response<unknown>> {
    return cy.request({
      method: options.method,
      url: `${Cypress.env('apiUrl')}${this.basePath}${options.path}`,
      body: options.body,
      headers: options.headers,
      failOnStatusCode: false,
      // Render free-tier services can cold-start; give the first request
      // room. retryOnNetworkFailure defaults to true in Cypress already -
      // stated explicitly here so the cold-start handling this spec
      // promises is visible in the code, not an unstated default.
      timeout: 30000,
      retryOnNetworkFailure: true,
    });
  }

  // Returns the parsed body, or throws ApiError on 4xx/5xx - the default for
  // "arrange" calls that expect success.
  protected request<T>(options: ApiRequestOptions): Cypress.Chainable<T> {
    return this.requestRaw(options).then((response) => {
      if (response.status >= 400) {
        throw new ApiError(
          response.status,
          response.body,
          `${options.method} ${this.basePath}${options.path} failed with ${response.status}`,
        );
      }
      return response.body as T;
    });
  }
}
```

- [ ] **Step 4: Run it, confirm it passes**

```bash
npx cypress run --spec cypress/unit/baseApiClient.cy.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/http/ApiError.ts src/core/http/BaseApiClient.ts cypress/unit/baseApiClient.cy.ts
git commit -m "Add BaseApiClient (Template Method for API calls) and ApiError"
```

---

### Task 6: BaseUiComponent (Template Method)

**Files:**
- Create: `src/core/ui/BaseUiComponent.ts`
- Test: `cypress/unit/baseUiComponent.cy.ts`

**Interfaces:**
- Produces: `abstract class BaseUiComponent { protected abstract readonly route: string; protected abstract readonly readySelector: string; load(): void }`

- [ ] **Step 1: Write the failing test**

This test visits the real OmniPizza frontend root and waits on `body` — deliberately generic,
because the app's real `data-testid` values aren't known yet (that's Task 9). It proves the
visit-then-wait skeleton, not app-specific behavior.

`cypress/unit/baseUiComponent.cy.ts`:

```typescript
import { BaseUiComponent } from '../../src/core/ui/BaseUiComponent';

class RootPageComponent extends BaseUiComponent {
  protected readonly route = '/';
  protected readonly readySelector = 'body';
}

describe('BaseUiComponent', () => {
  it('visits its route and waits for the ready selector to become visible', () => {
    new RootPageComponent().load();
    cy.get('body').should('be.visible');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npx cypress run --spec cypress/unit/baseUiComponent.cy.ts
```

Expected: FAIL — `BaseUiComponent` doesn't exist yet.

- [ ] **Step 3: Implement BaseUiComponent**

`src/core/ui/BaseUiComponent.ts`:

```typescript
export abstract class BaseUiComponent {
  protected abstract readonly route: string;
  protected abstract readonly readySelector: string;

  load(): void {
    cy.visit(this.route);
    cy.get(this.readySelector, { timeout: 15000 }).should('be.visible');
  }
}
```

- [ ] **Step 4: Run it, confirm it passes**

```bash
npx cypress run --spec cypress/unit/baseUiComponent.cy.ts
```

Expected: PASS — 1 test. (This hits the real Render-hosted frontend; allow for a slow first run if
the service is cold.)

- [ ] **Step 5: Commit**

```bash
git add src/core/ui/BaseUiComponent.ts cypress/unit/baseUiComponent.cy.ts
git commit -m "Add BaseUiComponent (Template Method for visit-then-wait)"
```

---

### Task 7: AtomicScenario (Template Method — the centerpiece)

**Files:**
- Create: `src/core/ui/AtomicScenario.ts`
- Test: `cypress/unit/atomicScenario.cy.ts`

**Interfaces:**
- Produces: `interface AtomicScenarioSteps { arrangeViaApi(): void; hydrateUi(): void; assertUi(): void }` and `class AtomicScenario { static for(slice: string): AtomicScenario; run(steps: AtomicScenarioSteps): void }` — every slice's step definitions call `AtomicScenario.for('<slice>').run({...})`.

- [ ] **Step 1: Write the failing test**

Uses plain synchronous stub functions (not real `cy.*` commands) — this test is only about the
skeleton's call order, which is a synchronous JS concern independent of Cypress's own command queue.

`cypress/unit/atomicScenario.cy.ts`:

```typescript
import { AtomicScenario } from '../../src/core/ui/AtomicScenario';

describe('AtomicScenario', () => {
  it('runs arrangeViaApi, then hydrateUi, then assertUi, in that order', () => {
    const callOrder: string[] = [];

    AtomicScenario.for('test-slice').run({
      arrangeViaApi: () => callOrder.push('arrangeViaApi'),
      hydrateUi: () => callOrder.push('hydrateUi'),
      assertUi: () => callOrder.push('assertUi'),
    });

    expect(callOrder).to.deep.equal(['arrangeViaApi', 'hydrateUi', 'assertUi']);
  });

  it('calls each step exactly once', () => {
    const arrangeViaApi = cy.stub();
    const hydrateUi = cy.stub();
    const assertUi = cy.stub();

    AtomicScenario.for('test-slice').run({ arrangeViaApi, hydrateUi, assertUi });

    expect(arrangeViaApi).to.be.calledOnce;
    expect(hydrateUi).to.be.calledOnce;
    expect(assertUi).to.be.calledOnce;
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npx cypress run --spec cypress/unit/atomicScenario.cy.ts
```

Expected: FAIL — `AtomicScenario` doesn't exist yet.

- [ ] **Step 3: Implement AtomicScenario**

`src/core/ui/AtomicScenario.ts`:

```typescript
export interface AtomicScenarioSteps {
  arrangeViaApi: () => void;
  hydrateUi: () => void;
  assertUi: () => void;
}

export class AtomicScenario {
  private constructor(private readonly slice: string) {}

  static for(slice: string): AtomicScenario {
    return new AtomicScenario(slice);
  }

  run(steps: AtomicScenarioSteps): void {
    steps.arrangeViaApi();
    steps.hydrateUi();
    steps.assertUi();
  }
}
```

- [ ] **Step 4: Run it, confirm it passes**

```bash
npx cypress run --spec cypress/unit/atomicScenario.cy.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/ui/AtomicScenario.ts cypress/unit/atomicScenario.cy.ts
git commit -m "Add AtomicScenario (Template Method for arrange-hydrate-assert)"
```

---

### Task 8: Observer reporting (ReportingSubject, ConsoleObserver, GithubActionsSummaryObserver)

**Files:**
- Create: `src/core/reporting/Observer.ts`
- Create: `src/core/reporting/ReportingSubject.ts`
- Create: `src/core/reporting/ConsoleObserver.ts`
- Create: `src/core/reporting/GithubActionsSummaryObserver.ts`
- Test: `src/core/reporting/reporting.node.test.ts`
- Modify: `cypress.config.ts` — wire `after:spec` to the subject

**Interfaces:**
- Produces: `interface TestResult { specPath: string; title: string; state: 'passed'|'failed'|'pending'|'skipped'; durationMs: number; slice: string }`, `interface Observer { onSpecComplete(results: TestResult[]): void }`, `class ReportingSubject { subscribe(o: Observer): void; notify(results: TestResult[]): void }`.

This is the one pattern whose implementation and test both live outside Cypress's browser context —
see Global Constraints. `ConsoleObserver` and `GithubActionsSummaryObserver` are only ever
instantiated from `cypress.config.ts` (Node process), never from `cypress/support/e2e.ts` or any
spec file.

- [ ] **Step 1: Write the failing test**

`src/core/reporting/reporting.node.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReportingSubject } from './ReportingSubject';
import { GithubActionsSummaryObserver } from './GithubActionsSummaryObserver';
import type { TestResult } from './Observer';

const sampleResult: TestResult = {
  specPath: 'cypress/e2e/auth/auth.feature',
  title: 'A standard customer logs in successfully',
  state: 'passed',
  durationMs: 842,
  slice: 'auth',
};

test('ReportingSubject notifies every subscribed observer with the same results', () => {
  const received: TestResult[][] = [];
  const subject = new ReportingSubject();
  subject.subscribe({ onSpecComplete: (results) => received.push(results) });
  subject.subscribe({ onSpecComplete: (results) => received.push(results) });

  subject.notify([sampleResult]);

  assert.equal(received.length, 2);
  assert.deepEqual(received[0], [sampleResult]);
  assert.deepEqual(received[1], [sampleResult]);
});

test('GithubActionsSummaryObserver appends a markdown table row to the summary file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gha-summary-'));
  const summaryFile = join(dir, 'summary.md');
  const observer = new GithubActionsSummaryObserver(summaryFile);

  observer.onSpecComplete([sampleResult]);

  const content = readFileSync(summaryFile, 'utf8');
  assert.match(content, /\| auth \| A standard customer logs in successfully \| passed \| 842ms \|/);
});

test('GithubActionsSummaryObserver is a no-op when no summary path is configured', () => {
  const observer = new GithubActionsSummaryObserver(undefined);
  assert.doesNotThrow(() => observer.onSpecComplete([sampleResult]));
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
npm run test:unit:node
```

Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement Observer, ReportingSubject, ConsoleObserver, GithubActionsSummaryObserver**

`src/core/reporting/Observer.ts`:

```typescript
export interface TestResult {
  specPath: string;
  title: string;
  state: 'passed' | 'failed' | 'pending' | 'skipped';
  durationMs: number;
  slice: string;
}

export interface Observer {
  onSpecComplete(results: TestResult[]): void;
}
```

`src/core/reporting/ReportingSubject.ts`:

```typescript
import type { Observer, TestResult } from './Observer';

export class ReportingSubject {
  private readonly observers: Observer[] = [];

  subscribe(observer: Observer): void {
    this.observers.push(observer);
  }

  notify(results: TestResult[]): void {
    this.observers.forEach((observer) => observer.onSpecComplete(results));
  }
}
```

`src/core/reporting/ConsoleObserver.ts`:

```typescript
import type { Observer, TestResult } from './Observer';

const ICONS: Record<TestResult['state'], string> = {
  passed: '✅',
  failed: '❌',
  pending: '⏸️',
  skipped: '⏭️',
};

export class ConsoleObserver implements Observer {
  onSpecComplete(results: TestResult[]): void {
    for (const result of results) {
      console.log(`${ICONS[result.state]} [${result.slice}] ${result.title} (${result.durationMs}ms)`);
    }
  }
}
```

`src/core/reporting/GithubActionsSummaryObserver.ts`:

```typescript
import { appendFileSync } from 'node:fs';
import type { Observer, TestResult } from './Observer';

export class GithubActionsSummaryObserver implements Observer {
  constructor(private readonly summaryFilePath: string | undefined) {}

  onSpecComplete(results: TestResult[]): void {
    if (!this.summaryFilePath || results.length === 0) return;
    const rows = results
      .map((r) => `| ${r.slice} | ${r.title} | ${r.state} | ${r.durationMs}ms |`)
      .join('\n');
    appendFileSync(
      this.summaryFilePath,
      `\n| Slice | Test | State | Duration |\n|---|---|---|---|\n${rows}\n`,
    );
  }
}
```

- [ ] **Step 4: Run it, confirm it passes**

```bash
npm run test:unit:node
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Wire the subject into cypress.config.ts's after:spec**

Modify `cypress.config.ts` — add inside `setupNodeEvents`, before `return config;`:

```typescript
    const reportingSubject = new ReportingSubject();
    reportingSubject.subscribe(new ConsoleObserver());
    reportingSubject.subscribe(new GithubActionsSummaryObserver(process.env.GITHUB_STEP_SUMMARY));

    on('after:spec', (spec, results) => {
      const sliceMatch = spec.relative.match(/cypress\/e2e\/([^/]+)\//);
      const slice = sliceMatch ? sliceMatch[1] : 'unknown';
      const testResults = (results?.tests ?? []).map((t) => ({
        specPath: spec.relative,
        title: t.title.join(' > '),
        state: t.state as TestResult['state'],
        durationMs: t.duration ?? 0,
        slice,
      }));
      reportingSubject.notify(testResults);
    });
```

Add the imports at the top of `cypress.config.ts`:

```typescript
import { ReportingSubject } from './src/core/reporting/ReportingSubject';
import { ConsoleObserver } from './src/core/reporting/ConsoleObserver';
import { GithubActionsSummaryObserver } from './src/core/reporting/GithubActionsSummaryObserver';
import type { TestResult } from './src/core/reporting/Observer';
```

If `results.tests[].title`/`.state`/`.duration` don't match this shape once you run it, check
`node_modules/cypress/types/cypress.d.ts` for the exact `CypressCommandLine.TestResult` shape in the
installed version and adjust the mapping accordingly.

- [ ] **Step 6: Verify with a real spec run**

```bash
npx cypress run --spec cypress/unit/atomicScenario.cy.ts
```

Expected: passes, and the terminal shows `ConsoleObserver`'s `✅ [unknown] ...` lines (slice shows
as `unknown` here since this spec isn't under `cypress/e2e/<slice>/` — that's expected and will read
correctly once Task 10's spec runs under `cypress/e2e/auth/`).

- [ ] **Step 7: Commit**

```bash
git add src/core/reporting cypress.config.ts
git commit -m "Add Observer-pattern reporting (ReportingSubject, ConsoleObserver, GithubActionsSummaryObserver)"
```

---

### Task 9: Locator + config harvest for the Auth slice

**Files:**
- Create: `src/features/auth/locators/auth.locators.json`
- Create: `src/core/config/storageKeys.ts`

**Interfaces:**
- Produces: `AUTH_TOKEN_STORAGE_KEY: string` (real value, discovered here) and a `LocatorTree`-shaped JSON file with (at minimum) the keys: `login.usernameInput`, `login.passwordInput`, `login.submitButton`, `login.lockedOutError`, `landing.readyMarker`, plus the real login route and real post-login landing route (recorded as comments/notes for Task 10, since routes aren't locator keys).

This task is a live investigation against the real app, not code with a known answer up front — the
steps below are the concrete procedure; the selector/route **values** are whatever you find, not
values to guess. **`cypress open` is very unlikely to work in this sandboxed background session**
(no interactive desktop reliably attached to this process) — use `claude-in-chrome` browser
automation instead, which drives a real Chrome window directly and is already available in this
environment.

- [ ] **Step 1: Load the browser automation tools**

Call `ToolSearch` with query `"select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__get_page_text"` if these aren't already loaded.

- [ ] **Step 2: Open the app and inspect the login form**

Create a new tab, navigate to `https://omnipizza-frontend.onrender.com`. Use `read_page` (or
`get_page_text` plus `computer` screenshots if `read_page` doesn't surface `data-testid` attributes
directly) to find the actual selectors for: the username input, password input, and submit button on
the login screen. Note the exact route you landed on (is login at `/`, or does `/` redirect to
`/login`?).

- [ ] **Step 3: Log in as standard_user and find the post-login landing marker**

Submit the login form with `standard_user` / `pizza123`. Note the resulting route, and find one
stable element (via `data-testid`) that reliably indicates "the authenticated app has loaded" — this
becomes `landing.readyMarker`. Prefer something slice-agnostic (a nav bar, a page-level container)
over something specific to one feature.

- [ ] **Step 4: Find the auth token's localStorage key**

With `javascript_tool` (load via `ToolSearch` if not already available) or the browser's own
devtools-equivalent inspection, run `Object.keys(localStorage)` against the authenticated page and
identify which key holds the JWT issued by `/api/auth/login`. Confirm by checking the value starts
with the same JWT you'd get from the API (`eyJhbGci...`).

- [ ] **Step 5: Log out (or open a fresh tab) and inspect the locked-out error state**

Attempt to log in as `locked_out_user` / `pizza123` through the real UI form. Find the selector for
whatever error message/banner the frontend shows.

- [ ] **Step 6: Write the discovered values**

`src/features/auth/locators/auth.locators.json` — replace the example values below with what you
actually found in Steps 2–5 (the structure/keys must match; the string values must be real):

```json
{
  "login": {
    "usernameInput": "REPLACE-WITH-REAL-SELECTOR",
    "passwordInput": "REPLACE-WITH-REAL-SELECTOR",
    "submitButton": "REPLACE-WITH-REAL-SELECTOR",
    "lockedOutError": "REPLACE-WITH-REAL-SELECTOR"
  },
  "landing": {
    "readyMarker": "REPLACE-WITH-REAL-SELECTOR"
  }
}
```

`src/core/config/storageKeys.ts`:

```typescript
export const AUTH_TOKEN_STORAGE_KEY = 'REPLACE-WITH-REAL-KEY-NAME';
```

Also record the real login route and post-login route as a one-line comment above the JSON's
`login` key isn't valid JSON — instead note them in the commit message (Step 7) so Task 10 can use
them for `cy.visit()` calls.

- [ ] **Step 7: Commit**

```bash
git add src/features/auth/locators/auth.locators.json src/core/config/storageKeys.ts
git commit -m "Harvest real locators and storage key for the Auth slice

Login route: <real route found in Step 2>
Post-login landing route: <real route found in Step 3>"
```

---

### Task 10: Auth slice — API client, Factory, Facade, Gherkin, green run (milestone)

**Files:**
- Create: `src/features/auth/api/AuthApiClient.ts`
- Create: `src/features/auth/data/UserFactory.ts`
- Create: `src/features/auth/facade/AuthFacade.ts`
- Create: `cypress/e2e/auth/auth.feature`
- Create: `src/features/auth/steps/auth.steps.ts`
- Modify: `cypress/support/e2e.ts` — add `createAuthFacade()`

**Interfaces:**
- Consumes: `BaseApiClient` (Task 5), `LocatorProxy` (Task 4), `AtomicScenario` (Task 7), `AuthSession` type (Task 3), `AUTH_TOKEN_STORAGE_KEY` + `auth.locators.json` (Task 9).
- Produces: `createAuthFacade(): AuthFacade` (exported from `cypress/support/e2e.ts`) — this is the pattern later slices (Catalog/Checkout/Orders, in the follow-up plan) repeat: one `create<Slice>Facade()` export per slice from the same composition root file.

- [ ] **Step 1: Write AuthApiClient**

`src/features/auth/api/AuthApiClient.ts`:

```typescript
import { BaseApiClient } from '../../../core/http/BaseApiClient';
import type { AuthSession } from '../../../core/types';

interface LoginResponseBody {
  access_token: string;
  token_type: string;
  username: string;
  behavior: string;
}

function toAuthSession(body: LoginResponseBody): AuthSession {
  return {
    accessToken: body.access_token,
    tokenType: 'bearer',
    username: body.username,
    behavior: body.behavior,
  };
}

export class AuthApiClient extends BaseApiClient {
  protected readonly basePath = '/api/auth';

  // Expects success - throws ApiError on 4xx/5xx (e.g. wrong password).
  login(username: string, password: string): Cypress.Chainable<AuthSession> {
    return this.request<LoginResponseBody>({
      method: 'POST',
      path: '/login',
      body: { username, password },
    }).then(toAuthSession);
  }

  // For scenarios where a non-2xx response IS the expected outcome
  // (e.g. locked_out_user) - never throws, callers assert on .status themselves.
  attemptLogin(username: string, password: string): Cypress.Chainable<Cypress.Response<unknown>> {
    return this.requestRaw({
      method: 'POST',
      path: '/login',
      body: { username, password },
    });
  }
}
```

`requestRaw` is `protected` on `BaseApiClient` — accessible here because `AuthApiClient extends
BaseApiClient`.

- [ ] **Step 2: Write UserFactory**

`src/features/auth/data/UserFactory.ts`:

```typescript
export interface TestUser {
  username: string;
  password: string;
}

const DETERMINISTIC_USERS = {
  standard: { username: 'standard_user', password: 'pizza123' },
  lockedOut: { username: 'locked_out_user', password: 'pizza123' },
  problem: { username: 'problem_user', password: 'pizza123' },
  performanceGlitch: { username: 'performance_glitch_user', password: 'pizza123' },
  error: { username: 'error_user', password: 'pizza123' },
  a11yGlitch: { username: 'a11y_glitch_user', password: 'pizza123' },
  securityGlitch: { username: 'security_glitch_user', password: 'pizza123' },
} as const satisfies Record<string, TestUser>;

export type DeterministicUserKey = keyof typeof DETERMINISTIC_USERS;

export class UserFactory {
  static deterministic(key: DeterministicUserKey): TestUser {
    return DETERMINISTIC_USERS[key];
  }
}
```

- [ ] **Step 3: Write AuthFacade**

`src/features/auth/facade/AuthFacade.ts`:

```typescript
import { AuthApiClient } from '../api/AuthApiClient';
import { LocatorProxy } from '../../../core/locators/LocatorProxy';
import { UserFactory, type DeterministicUserKey } from '../data/UserFactory';
import type { AuthSession } from '../../../core/types';

export class AuthFacade {
  constructor(
    private readonly authApi: AuthApiClient,
    private readonly locators: LocatorProxy,
  ) {}

  // API-only: returns the session, never touches localStorage. Cypress can
  // only safely write localStorage for the app's origin AFTER cy.visit() has
  // navigated there - doing it here (before any visit) would write to the
  // wrong window/origin. Hydration is the step definition's job, after visiting.
  loginAs(userKey: DeterministicUserKey): Cypress.Chainable<AuthSession> {
    const user = UserFactory.deterministic(userKey);
    return this.authApi.login(user.username, user.password);
  }

  attemptLoginAs(userKey: DeterministicUserKey): Cypress.Chainable<Cypress.Response<unknown>> {
    const user = UserFactory.deterministic(userKey);
    return this.authApi.attemptLogin(user.username, user.password);
  }

  submitLoginFormAs(userKey: DeterministicUserKey): void {
    const user = UserFactory.deterministic(userKey);
    cy.get(this.locators.get('login.usernameInput')).type(user.username);
    cy.get(this.locators.get('login.passwordInput')).type(user.password);
    cy.get(this.locators.get('login.submitButton')).click();
  }

  assertLandedOnCatalog(): void {
    cy.get(this.locators.get('landing.readyMarker')).should('be.visible');
  }

  assertLockedOutMessageVisible(): void {
    cy.get(this.locators.get('login.lockedOutError')).should('be.visible');
  }
}
```

- [ ] **Step 4: Wire the composition root**

Modify `cypress/support/e2e.ts`:

```typescript
import { AuthApiClient } from '../../src/features/auth/api/AuthApiClient';
import { AuthFacade } from '../../src/features/auth/facade/AuthFacade';
import { LocatorProxy } from '../../src/core/locators/LocatorProxy';
import authLocators from '../../src/features/auth/locators/auth.locators.json';

export function createAuthFacade(): AuthFacade {
  return new AuthFacade(new AuthApiClient(), new LocatorProxy(authLocators));
}
```

- [ ] **Step 5: Write the feature file**

`cypress/e2e/auth/auth.feature` — pure business language; note that "logs in" (fast, API-seeded) and
"attempt to log in" (slower, real-form-driven) read as ordinary English, with the actual
implementation difference hidden entirely in the step definitions below:

```gherkin
Feature: Authentication

  Scenario: A standard customer logs in successfully
    Given a standard customer
    When they log in
    Then they should land on the catalog page as an authenticated customer

  Scenario: A locked-out customer cannot log in
    Given a locked-out customer
    When they attempt to log in
    Then they should see a locked-out account message
```

- [ ] **Step 6: Write the step definitions**

`src/features/auth/steps/auth.steps.ts` — replace `<LOGIN_ROUTE>` and `<POST_LOGIN_ROUTE>` with the
real routes recorded in Task 9's commit message. Two design points worth calling out:

1. **The `When` steps are intentionally empty.** `AtomicScenario`'s whole thesis is that
   `arrangeViaApi`/`hydrateUi`/`assertUi` fire together as one atomic unit (spec §7) — splitting the
   assertion into a separate `Then` step outside `AtomicScenario.run()` would defeat that, so the
   full `run()` call (all three phases, including the real assertion in `assertUi`) happens in the
   `Then` step below. `Given`/`When` only record intent (which user, which action) into shared
   module-level state; nothing Cypress-visible happens until `Then` runs the atomic flow.
2. **`locked_out_user` returns HTTP `403`, not `401`** — verified directly against the live API
   (`curl` returned `403 Forbidden`), not assumed.

```typescript
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { createAuthFacade } from '../../../../cypress/support/e2e';
import { AtomicScenario } from '../../../core/ui/AtomicScenario';
import { AUTH_TOKEN_STORAGE_KEY } from '../../../core/config/storageKeys';
import type { DeterministicUserKey } from '../data/UserFactory';

let userKey: DeterministicUserKey;

Given('a standard customer', () => {
  userKey = 'standard';
});

Given('a locked-out customer', () => {
  userKey = 'lockedOut';
});

// Intentionally empty - see the note above Step 6. Cucumber requires a step
// definition to exist for every line, but the actual work happens as one
// atomic run() call in the corresponding Then step below.
When('they log in', () => {});

When('they attempt to log in', () => {});

Then('they should land on the catalog page as an authenticated customer', () => {
  const facade = createAuthFacade();
  let accessToken: string;

  AtomicScenario.for('auth').run({
    arrangeViaApi: () => {
      facade.loginAs(userKey).then((session) => {
        accessToken = session.accessToken;
      });
    },
    hydrateUi: () => {
      // onBeforeLoad sets the token before the app's own JS boots, so there
      // is no race with a client-side auth-guard redirect: a plain
      // visit-then-set-localStorage-then-reload sequence risks landing on
      // POST_LOGIN_ROUTE as an unauthenticated visitor, getting redirected
      // to the login page, setting the token too late, and reloading the
      // login page instead of the catalog.
      cy.visit('<POST_LOGIN_ROUTE>', {
        onBeforeLoad: (win) => win.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken),
      });
    },
    assertUi: () => {
      facade.assertLandedOnCatalog();
    },
  });
});

Then('they should see a locked-out account message', () => {
  const facade = createAuthFacade();

  AtomicScenario.for('auth').run({
    arrangeViaApi: () => {
      facade.attemptLoginAs(userKey).then((response) => {
        expect(response.status).to.equal(403);
      });
    },
    hydrateUi: () => {
      cy.visit('<LOGIN_ROUTE>');
      facade.submitLoginFormAs(userKey);
    },
    assertUi: () => {
      facade.assertLockedOutMessageVisible();
    },
  });
});
```

Note on `expect` inside `arrangeViaApi`: Cypress's global `expect` (Chai) is available in step files
without an import, same as in `.cy.ts` specs.

- [ ] **Step 7: Run the auth suite, confirm both scenarios pass**

```bash
npx cypress run --spec cypress/e2e/auth/auth.feature
```

Expected: PASS — 2 scenarios. If either selector/route is wrong, fix it in `auth.locators.json` (not
in the step definitions or Facade) — the whole point of the Proxy pattern is that selector drift is a
one-line JSON fix, not a code change.

- [ ] **Step 8: Run the full suite once, confirm nothing regressed**

```bash
npm run typecheck
npx cypress run
```

Expected: `typecheck` exits 0. `cypress run` runs all specs under `cypress/unit/**` and
`cypress/e2e/**` — all green.

- [ ] **Step 9: Commit**

```bash
git add src/features/auth cypress/e2e/auth cypress/support/e2e.ts
git commit -m "Implement Auth slice end to end (API client, Factory, Facade, Gherkin) - milestone: architecture proven green"
```

This is the milestone: `AtomicScenario`, `LocatorProxy`, `BaseApiClient`, the Facade pattern, and the
Observer reporting pipeline have all now run against the real, live OmniPizza app and produced a
passing, demoable suite. Catalog, Checkout, and Orders (the follow-up plan) repeat this exact shape.

---

## Self-Review

**1. Spec coverage (spec §§1–12 only, per Scope Cut):**
- §1 Purpose, §2 System, §3 Scope: covered by Task 9/10 targeting the real app and the Auth slice specifically.
- §4 Principles: SRP/OCP/LSP/ISP/DIP/DRY/LoD are all embodied in the Task 3–10 file boundaries (Facade-only step defs, injected collaborators, one composition root per process). KISS/YAGNI: Task 8's `tsx`/`node:test` addition is justified inline, per Global Constraints.
- §5 Patterns: Proxy (Task 4), Template Method ×3 (Tasks 5, 6, 7), Observer (Task 8), Facade (Task 10). Strategy, Builder, and Adapter are **not** in this plan — they belong to Checkout/Cucumber-step-def work in the follow-up plan, since Auth doesn't need per-country validation or a checkout payload builder.
- §6 Deliberately not built: respected — no Repository layer, no Singleton, no Chain of Responsibility, no Command pattern anywhere in Tasks 1–10.
- §7 AtomicScenario: Task 7, consumed by Task 10.
- §8 Gherkin: Task 10's `.feature` file and step defs follow the business-language-only rule; `cy.prompt` itself is out of scope for Auth (Checkout-only per spec) and deferred to the follow-up plan.
- §9 Observer: Task 8, matches the corrected two-Observer / mochawesome-is-config design.
- §10 Folder structure: matches, modulo the smoke-test files (Task 2) which are deleted before Task 3.
- §11 CI/CD, §13 Repo, §14 Open items: explicitly deferred — no task here creates `.github/workflows/`.
- §12 Implementation approach: Task 9 is the "locator harvest before fan-out" step, scoped to what Auth needs; Task 10 is the "auth green first" milestone. The 4-way parallel fan-out itself starts in the follow-up plan.

**2. Placeholder scan:** The only literal `REPLACE-WITH-*` strings are in Task 9 (a live discovery
task, not a step whose content should be pre-known) and Task 10's `<LOGIN_ROUTE>`/`<POST_LOGIN_ROUTE>`
placeholders, which Task 9's commit message resolves before Task 10 runs — both are flagged inline
as "replace with your Task 9 findings," not left as unexplained TODOs.

**3. Type consistency:** `AuthSession`, `DeterministicUserKey`, `TestResult`, `Observer`,
`ApiRequestOptions`, `LocatorTree`, `AtomicScenarioSteps` are each defined exactly once (Tasks 3, 4,
5, 7, 8, 10's `UserFactory`) and referenced with matching names/shapes in every later task that uses
them. `requestRaw`/`request` signatures in Task 5 match their exact usage in Task 10's
`AuthApiClient`.

**4. External audit pass (2026-08-19):** this plan was independently audited after the first draft.
Every finding was verified against real systems before being acted on (live API responses, live
OpenAPI schema, an isolated `tsc` run, the cucumber preprocessor's actual `[filepath]` behavior, and
an actual `claude-in-chrome` call) rather than applied on trust. Confirmed and fixed: the
`NodeNext`+extensionless-import conflict (→ `bundler` resolution), the `stepDefinitions` glob
mismatch (→ static glob), `AtomicScenario`'s `assertUi` being left empty with real assertions
stranded in separate `Then` steps (→ moved inside `assertUi`, `When` steps now intentionally empty),
the localStorage hydration race (→ `onBeforeLoad`), `locked_out_user` returning `403` not `401`
(verified live), Task 3's speculative types not matching the real OpenAPI and not even being used by
Tasks 1–10 (→ cut down to just `AuthSession`), and `typescript@^5.7.0` being both a nonexistent
version and inconsistent with this plan's own "resolve current versions" instruction (→ `^5.9.3`,
with the reasoning for not using the newer `7.x` major stated inline). One finding in the audit was
checked and found **incorrect**: `claude-in-chrome` was claimed to be unavailable in this
environment; it was tested live (real tab context, successful navigation to the live frontend) and
works fine — Task 9's approach is unchanged.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-19-cypress-conf-2026-core-and-auth-slice.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
