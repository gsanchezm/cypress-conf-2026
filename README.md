# cypress-conf-2026

<p align="center">
  <strong>An Atomic Testing Architecture for Cypress — API, Web & AI Agents</strong><br />
  Featuring <a href="https://gsanchezm.github.io/OmniPizza/">OmniPizza</a>: A real, independently deployed multi-market platform.
</p>

<p align="center">
  <a href="README.md"><strong>English</strong></a> ·
  <a href="README_ES.md"><strong>Español</strong></a> ·
  <a href="README_DE.md"><strong>Deutsch</strong></a> ·
  <a href="README_ZH.md"><strong>简体中文</strong></a> ·
  <a href="README_HI.md"><strong>हिन्दी</strong></a>
</p>

---

## 🌟 Overview

**cypress-conf-2026** demonstrates an end-to-end atomic testing architecture that bridges three pillars:
1. **Atomic Scenarios:** API-seeded state hydration followed by focused UI verification.
2. **AI Agent Governance:** Deterministic mechanical hooks that prevent AI agents from altering test contracts.
3. **Enterprise Observability:** Seamless reporting to **TestRail** (bulk HTTP) and **Cypress Cloud CLI** with autonomous CI triage.

### 🍕 System Under Test (SUT): OmniPizza
A complete production-style platform built specifically for testing:
- **Web App:** [omnipizza-frontend.onrender.com](https://omnipizza-frontend.onrender.com)
- **API (OpenAPI 3.1):** [omnipizza-backend.onrender.com/api/docs](https://omnipizza-backend.onrender.com/api/docs)
- **5 Regional Markets:** 🇺🇸 US (Zip code) · 🇲🇽 MX (Colonia) · 🇨🇭 CH (Postal code) · 🇯🇵 JP (Prefecture) · 🇸🇦 SA (District, RTL Arabic).
- **Setup Endpoints:** Endpoints tagged `(atomic test setup)` allow seeding user sessions and carts over HTTP in milliseconds.

---

## 📐 Atomic Testing Architecture

Instead of slow, fragile multi-screen UI journeys (Login ➔ Catalog ➔ Cart ➔ Checkout), every test follows the **Template Method** pattern via `AtomicScenario`:

```text
1. arrangeViaApi()  ➔ Real HTTP requests to seed state and verify the API contract.
        ⬇
2. hydrateUi()      ➔ Inject state into browser (session/localStorage) and execute only the target action.
        ⬇
3. assertUi()       ➔ One single check on the rendered DOM.
```

### The Assertion Budget Rule: Max 2 Assertions
- **1 API Claim:** Verifies business logic and contract (e.g., HTTP 201 Created).
- **1 UI Claim:** Verifies rendered output (e.g., formatted total matches API total byte-for-byte).
- **Preconditions & Guards:** Infrastructure checks (`precondition()`) and DOM readiness (`.should('be.visible')`) do **not** count toward the budget and throw `PreconditionError` if unfulfilled.

---

## 🤖 Agentic Ecosystem & Safety Hooks

The repository can be operated by any coding agent with repository and shell access, including Claude Code, Codex, Copilot, and DeepSeek. The tests and CI do not depend on a model provider:

| Component | Role | Mechanism |
|---|---|---|
| **`AGENTS.md`** | Shared contract | Assertion budget, oracle ownership, pnpm commands, and boundaries. |
| **`agent/roles/`** | Shared task prompts | Read-only triage and bounded repair for any assistant. |
| **`guard-oracle.ts`** | Oracle Protection Hook | Blocks edits to `.feature` files and `assert*` methods (Exit 2). |
| **`guard-bash.ts`** | Command Gatekeeper Hook | Denies unauthorized `--record`, `cyPrompt`, and `git push`. |
| **`cypress-tap`** | Live Agent Feedback | The `cy-fixer` role inspects real DOM snapshots via `cypress open`. |
| **`cypress-cloud-cli`** | Cloud Inspection | The `cy-triage` role investigates runs and timelines via `cy-cloud`. |
| **Graphify** | Local Context Graph | Maps 630+ symbols and dependencies into a queryable graph without LLM API costs. |

---

## 🛡️ Three Tiers of Self-Healing ("Ring Check")

When an application change alters the DOM (demonstrated via `MUTATE_DOM=checkout.address` which renames `data-testid`), the framework offers three recovery tiers:

1. **A11y Fallbacks (`HEAL_LOCATORS=a11y`):** Instant, $0 cost, zero LLM. Heals via harvested fallback tiers (`id` ➔ `name` ➔ `aria-label` ➔ `placeholder`). Works even for RTL Arabic.
2. **AI Agent Repair (`cy-fixer` role):** Inspects the failing DOM via `cypress tap` and patches `locators/*.json` within 5 iterations.
3. **AI Semantic Testing (`UI_STRATEGY=cyPrompt`):** Evaluates human-readable Markdown steps (`checkout.prompt.md`) directly against rendered UI semantics, bypassing selector registries entirely.

---

## 📊 Enterprise Observability

### TestRail Bulk Integration
- Custom `TestRailObserver` hooks into Cypress's `after:run` event.
- Reports complete test runs in **three bulk HTTP requests** (respects 180 req/min Cloud rate limits).
- TestRail outages never cause passing test suites to exit with a non-zero code.

### Cypress Cloud CLI & Autonomous CI
- **Local Inspection:** Inspect runs, replay timelines, and failure screenshots via `pnpm cloud:runs` and `cy-cloud`.
- **Autonomous CI (`ci-triage.yml`):** Classifies failed CI runs from logs without an LLM. If confidence in a transient `flake` or `cold_start` reaches 0.7, it triggers a rerun without human intervention.

For host-specific setup, skill links, and the difference between agent skills and runtime `cy.prompt`, see [the agent guide](agent/README.md). Claude Code's `CLAUDE.md` and `.claude/` files are compatibility adapters; `AGENTS.md` and `agent/` are the shared source of instructions. Automatic edit/command hooks require integration with each host.

---

## 🚀 Quickstart & Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Warm up backend services (Render free-tier)
pnpm warmup

# 3. Typecheck and run tests
pnpm typecheck
pnpm cy:run --browser chrome --spec cypress/e2e/checkout/checkout.feature

# 4. Live self-healing demo (A11y fallbacks)
pnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature \
  --expose MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y --config retries=0

# 5. Inspect Cypress Cloud CLI status
pnpm cloud:status
pnpm cloud:runs
```

---

## 📄 License
ISC © [Gilberto Sánchez (Mexitester)](https://linkedin.com/in/gilberto-sanchez-mares)
