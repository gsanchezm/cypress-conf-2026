# Cypress Conf 2026 architecture diagrams

Five original 16:9 diagrams explain the current integration and the proposed agentic demo. Each has an editable SVG and a 1600 × 900 PNG for PowerPoint, Keynote, or Google Slides. A sixth diagram of the agents was authored with Archify and exported as a clean PNG for the deck. `architecture-flow.pdf` combines the original five PNGs in order. Diagram labels are in English to match the talk assets; the narration below can be adapted to Spanish.

[Contact sheet](contact-sheet.png) · [Five-page PDF](architecture-flow.pdf)

| Slide | Use in the talk | Files |
| --- | --- | --- |
| 1. System architecture today | Name every live component and show the independent failure path. | [SVG](01-current-architecture.svg) · [PNG](01-current-architecture.png) |
| 2. One case, two contracts | Explain how `@C9` connects a TestRail case to a versioned Checkout scenario and how results go back. | [SVG](02-case-to-result.svg) · [PNG](02-case-to-result.png) |
| 3. Two UI adaptation paths | Separate deterministic locator fallback from Cloud-backed `cy.prompt`. | [SVG](03-healing-paths.svg) · [PNG](03-healing-paths.png) |
| 4. CI communication map | Walk through automatic verification, manual Cloud recording, and failure-only Claude triage. | [SVG](04-ci-and-triage.svg) · [PNG](04-ci-and-triage.png) |
| 5. Target agentic demo loop | Introduce the planned TestRail case reader and strict issue gate, clearly labeled as proposed. | [SVG](05-proposed-agentic-loop.svg) · [PNG](05-proposed-agentic-loop.png) |
| 6. Agent architecture | Separate agent skills, Claude adapters, the test harness, and runtime `cy.prompt`. | [Interactive Archify diagram](../../docs/agent-architecture.html) · [slide PNG](06-agent-workflow-archify.png) |

## What is implemented today

- Auth, Catalog, and Checkout provide 12 mapped Gherkin cases (`@C1`–`@C12`). The case ID is read from the feature file **after execution** for reporting. There is no `get_case` preflight reader yet. [Feature files](../../cypress/e2e) and [caseMap.ts](../../src/core/reporting/testrail/caseMap.ts) define the mapping.
- Each Checkout scenario has `arrangeViaApi`, `hydrateUi`, and `assertUi`. The API order and UI order are distinct; the API-computed total is compared with the rendered confirmation total. See [checkout.steps.ts](../../src/features/checkout/steps/checkout.steps.ts), [AtomicScenario.ts](../../src/core/ui/AtomicScenario.ts), and [CheckoutFacade.ts](../../src/features/checkout/facade/CheckoutFacade.ts).
- `cypress.config.ts` sends `after:spec` results to console and GitHub summary observers. When `TESTRAIL_URL` is configured, `after:run` invokes `TestRailObserver`, which creates a run, submits mapped passed/failed results, and closes it. A publishing failure is logged without changing Cypress's exit code. See [cypress.config.ts](../../cypress.config.ts) and [TestRailObserver.ts](../../src/core/reporting/testrail/TestRailObserver.ts).
- The deterministic suite runs on push and PR without Cloud recording by default. The `cy.prompt` Checkout suite is manual and always records to Cypress Cloud. [Deterministic workflow](../../.github/workflows/tests.yml) and [cy.prompt workflow](../../.github/workflows/cy-prompt-suite.yml) define these paths. The latter passed 5/5 in [Cloud run 8](https://cloud.cypress.io/projects/5v45hh/runs/8).
- A failure of the deterministic workflow starts the current Claude triage workflow. It reads logs, screenshots, and deterministic signals, then may rerun failures or publish a PR comment or issue. It does **not** yet have the stricter product regression gate drawn in slide 5. See [claude-ci-triage.yml](../../.github/workflows/claude-ci-triage.yml).
- Deterministic fallback (`HEAL_LOCATORS=a11y`) and `cy.prompt` are distinct mechanisms. The recorded five-market `cy.prompt` path passed; healing of the same deliberate DOM mutation on that path has not been verified. See [e2e.ts](../../cypress/support/e2e.ts), [locate.ts](../../src/core/ui/locate.ts), and [CyPromptCheckoutUiStrategy.ts](../../src/features/checkout/strategies/CyPromptCheckoutUiStrategy.ts).

## Proposed for the live agentic demo

Slide 5 follows the local [conference plan](../../docs/agentic-conference-plan.md): read one TestRail case, check an allowlisted mapping, execute the existing scenario, collect evidence, and use a bounded diagnostic agent. A policy gate would permit a product bug issue only with evidence of a real, repeatable business regression. This end-to-end path is **not implemented** yet.

## Regenerate

Edit [generate.py](generate.py), then run from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File presentation/architecture/render_png.ps1
```

`generate.py` uses the Python standard library. The PNG exporter uses installed Chrome or Edge in headless mode; it does not access a network service. The SVGs remain editable in vector software or by editing the generator. To rebuild the combined PDF:

The Archify diagram has its own [candidate JSON](../../.archify/architecture-agent-workflow-20261019/candidate.json). After finalizing it with Archify, run `python presentation/architecture/export_archify.py` to refresh the slide PNG and copy its standalone HTML to `docs/agent-architecture.html` for GitHub Pages.

```powershell
python -c "from PIL import Image; from pathlib import Path; p=Path('presentation/architecture'); images=[Image.open(f).convert('RGB') for f in sorted(p.glob('0[1-5]-*.png'))]; images[0].save(p/'architecture-flow.pdf', save_all=True, append_images=images[1:])"
```
