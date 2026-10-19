"""Rebuild the bundled slide deck while preserving its original asset manifest.

The original Design export is kept as deck-base.html. This script selects and
rewrites its sections, embeds local SVG diagrams, and replaces only the bundled
template string in docs/index.html. Images and fonts in the manifest stay intact.
"""

import base64
import json
import re
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).with_name("deck-base.html")
INDEX = ROOT / "docs" / "index.html"
ARCH = ROOT / "presentation" / "architecture"
SECTION = re.compile(r'<section data-label="([^"]+)"[^>]*>.*?</section>', re.S)
TEMPLATE = re.compile(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', re.S)


def text(value):
    return escape(value, quote=True)


def shell(label, title, notes, body, subtitle="", tag=""):
    top = f'<span style="font: 700 24px JetBrains Mono,monospace; color: var(--green); letter-spacing: 2px;">{text(tag)}</span>' if tag else ""
    sub = f'<p style="margin: 0; color: var(--mut); font-size: 30px; line-height: 1.3;">{text(subtitle)}</p>' if subtitle else ""
    return f'''<section data-label="{text(label)}" data-speaker-notes="{text(notes)}" style="background: var(--bg); color: var(--ink); font-family: Archivo,sans-serif; display: flex; flex-direction: column; box-sizing: border-box; padding: var(--pad); gap: 26px;">
  <div style="display: flex; flex-direction: column; gap: 14px;">{top}<h2 style="margin: 0; font-size: 68px; line-height: 1.05; font-weight: 900;">{text(title)}</h2>{sub}</div>
  <div style="flex: 1; min-height: 0;">{body}</div>
</section>'''


def card(title, lines, accent="var(--green)", small=False):
    size = 25 if small else 30
    content = "".join(f'<p style="margin: 0; color: var(--mut); font-size: {size}px; line-height: 1.35;">{text(line)}</p>' for line in lines)
    return f'<div style="background: var(--panel); border: 1px solid var(--line); border-top: 7px solid {accent}; padding: 28px 32px; display: flex; flex-direction: column; gap: 17px; min-width: 0;"><strong style="font-size: 35px; line-height: 1.12;">{text(title)}</strong>{content}</div>'


def grid(cards, columns=2, gap=28):
    return f'<div style="display: grid; grid-template-columns: repeat({columns}, minmax(0, 1fr)); gap: {gap}px; height: 100%; align-content: center;">{"".join(cards)}</div>'


def diagram(name):
    raw = (ARCH / name).read_bytes()
    encoded = base64.b64encode(raw).decode("ascii")
    return f'<img alt="{text(name)}" src="data:image/svg+xml;base64,{encoded}" style="display: block; width: 100%; height: 100%; object-fit: contain;"/>'


def code(lines):
    return f'<pre style="margin: 0; background: #080B08; border: 1px solid var(--line); border-left: 8px solid var(--green); padding: 38px 46px; color: var(--ink); font: 26px/1.6 JetBrains Mono,monospace; white-space: pre-wrap; overflow: hidden;">{text(lines)}</pre>'


def make_new_slides():
    slides = {}

    agenda = grid([
        card("01 · World premiere", ["OmniPizza: five markets, Web, Mobile, and OpenAPI", "~6 minutes"], small=True),
        card("02 · Atomic foundations", ["API arrange, UI hydrate, two-claim budget", "~9 minutes"], small=True),
        card("03 · Guarded agents", ["Six-rung case ladder, hooks, skills, Graphify", "~5 minutes"], small=True),
        card("04 · Live demo", ["TestRail, selector healing, cy.prompt, Cloud, triage", "~20 minutes · about half the talk"], small=True),
    ])
    slides["Agenda"] = shell("Agenda", "The 40-minute story", "Cuatro actos: OmniPizza 6 min, fundamentos 9 min, agentes con límites 5 min y demo en vivo 20 min. cy.prompt vive dentro del demo.", agenda, "A real system first; then the test architecture; then the agent at work.")

    slides["System Architecture"] = shell("System Architecture", "The system under the test system", "Muestra el mapa actual: GitHub Actions ejecuta Cypress sin LLM; OmniPizza es el sistema bajo prueba; TestRail y Cloud son salidas opcionales. El triage determinista funciona sin clave de modelo y Claude puede enriquecerlo.", diagram("01-current-architecture.svg"), "The executable core runs without an LLM; agent adapters are optional.")

    rungs = [
        card("1 · Gherkin", ["checkout.feature", "@C9 tags the Mexico Examples row"], small=True),
        card("2 · Step definition", ["checkout.steps.ts", "Maps market data; calls runCheckoutScenario"], small=True),
        card("3 · Template Method", ["AtomicScenario", "arrangeViaApi → hydrateUi → assertUi"], small=True),
        card("4 · Facade", ["CheckoutFacade", "Keeps domain actions and API contract together"], small=True),
        card("5 · UI strategy", ["Deterministic locator path or cy.prompt", "Only necessary UI actions"], small=True),
        card("6 · Claims", ["assert* methods", "At most one API + one rendered UI claim"], small=True),
    ]
    slides["Six-Level Case Ladder"] = shell("Six-Level Case Ladder", "Build one case, six rungs", "Recorre C9 de arriba a abajo. El tag @C9 mapea a TestRail pero todavía no existe lectura get_case previa a ejecutar. El escenario versionado decide qué correr; la aserción vive en assert*.", grid(rungs, 3, 24), "The versioned scenario owns execution; TestRail supplies the case identity.")

    slides["Code: AtomicScenario"] = shell("Code: AtomicScenario", "The Template Method in code", "Fragmento abreviado de checkout.steps.ts. AtomicScenario fija el orden arrangeViaApi, hydrateUi y assertUi; el step definition conecta datos y fachadas. El claim API ocurre dentro de arrangeViaApi y el claim UI en assertUi.", code("// checkout.steps.ts · abridged\nAtomicScenario.for('checkout').run({\n  arrangeViaApi: () => {\n    // seedCartViaApi → checkoutViaApi\n    checkoutFacade.assertOrderCreated(order);\n  },\n  hydrateUi: () => {\n    authFacade.loginViaUiWithMarket('standard', market);\n    checkoutFacade.completeCheckoutViaUi(checkoutData);\n  },\n  assertUi: () =>\n    checkoutFacade.assertOrderConfirmation(expectedOrder),\n});"), "The class fixes the phase order; the facade and strategy own the behavior.")

    slides["Guardrails"] = shell("Guardrails", "The agent has a fence", "CLAUDE.md define el contrato. guard-oracle bloquea editar feature files y claims; guard-bash bloquea comandos reservados como record y push dentro del agente. La autorización explícita del dueño prevalece en esta sesión.", grid([
        card("CLAUDE.md", ["Assertion budget, ownership, and allowed edits", "One spec at a time; pnpm-only workflow"], small=True),
        card("guard-oracle", ["Denies edits to .feature contracts", "Denies changes to assert* claims and assertions"], small=True),
        card("guard-bash", ["Denies agent-issued --record / cy.prompt", "Denies git push and protected commands"], small=True),
        card("Human-owned boundary", ["The owner authorizes Cloud and external writes", "A denied oracle edit is not a repair"], small=True),
    ]), "Deterministic hooks enforce the boundary before a model decides.")

    slides["Official Skills"] = shell("Official Skills", "Five Cypress skills, five jobs", "Nombra los cinco skills oficiales copiados de cypress-io/ai-toolkit. Son instrucciones especializadas para el asistente, no cinco agentes autónomos.", grid([
        card("cypress-tap", ["Red → green in an open cypress open session", "Inspect the failing DOM and command"], small=True),
        card("cypress-cloud-cli", ["Inspect runs, tests, screenshots", "Read Test Replay timelines"], small=True),
        card("cypress-author", ["Create or repair Cypress tests", "Within repository guardrails"], small=True),
        card("cypress-explain", ["Review and explain tests", "Read-only reasoning"], small=True),
        card("cypress-docs", ["Search official Cypress docs", "Ground API and feature claims"], small=True),
    ], 3, 24), "Skills guide the assistant; hooks and repository rules still apply.")

    slides["Subagents and Graphify"] = shell("Subagents and Graphify", "Diagnose, repair, understand", "Distingue subagentes de la ruta CI: cy-triage y cy-fixer son herramientas locales con permisos distintos. Graphify es un mapa estático local, snapshot de 634 nodos, 1,368 aristas y 24 comunidades; no llama a una API de pago para esta extracción.", grid([
        card("@agent-cy-triage", ["Read-only evidence review", "JSON verdict: cause, confidence, evidence"], small=True),
        card("@agent-cy-fixer", ["Fix steps, strategies, or selectors", "At most five red → green iterations"], small=True),
        card("Graphify local graph", ["634 nodes · 1,368 edges · 24 communities", "Hubs: SelectorSource, CountryCode, TestResult"], small=True),
    ], 3, 28), "The agent can navigate dependencies without scanning every file or paying for graph extraction.")

    slides["Live Demo Route"] = shell("Live Demo Route", "20 minutes, four scenes", "La mitad de la charla es demo. 1: C9 y su tag. 2: mutación real del DOM y fallback determinista. 3: Checkout con cy.prompt y corrida grabada. 4: TestRail, Cloud, pipeline y diagnóstico. get_case y el issue gate estricto se muestran como futuro, no como algo ya funcionando.", grid([
        card("1 · Case identity · 4 min", ["Show TestRail C9 and @C9 in Gherkin", "Run the versioned Checkout scenario"], small=True),
        card("2 · UI change · 6 min", ["MUTATE_DOM breaks a real data-testid", "HEAL_LOCATORS=a11y selects a unique fallback"], small=True),
        card("3 · AI Checkout · 6 min", ["Switch to CyPromptCheckoutUiStrategy", "Open recorded Cloud run 8: 5/5 passed"], small=True),
        card("4 · Evidence · 4 min", ["Inspect TestRail R7 and CI artifacts", "Explain model-free triage + optional Claude"], small=True),
    ]), "All live claims refer to behavior already verified; optional CLI access needs separate login.")

    slides["Two Strategies"] = shell("Two Strategies", "Same case, two UI engines", "La estrategia se elige en cypress/support/e2e.ts mediante UI_STRATEGY. El step definition y el oráculo no cambian. El fallback determinista y el self-healing de cy.prompt son mecanismos distintos.", grid([
        card("Deterministic", ["LocatorProxy → cy.get()", "Optional harvested a11y fallback", "No AI call"], small=True),
        card("cy.prompt", ["Natural-language steps against rendered UI", "Cypress Cloud recording", "Two calls per Checkout scenario"], small=True),
    ]), "createCheckoutFacade() selects the CheckoutUiStrategy; the .feature stays the same.")

    slides["cy.prompt Basics"] = shell("cy.prompt Basics", "AI Checkout, inside the demo", "El prompt no reemplaza el contrato Gherkin. Drive de catálogo a confirmación: dos llamadas por escenario. Una corrida de cinco mercados usa hasta diez ejecuciones cy.prompt antes de retries. La corrida grabada 8 pasó 5/5.", grid([
        card("One business action per call", ["Complete Checkout: one batched call", "Verify confirmation: one batched call"], small=True),
        card("Recorded evidence", ["Cypress Cloud project 5v45hh", "Run 8: five markets passed", "Cloud caches generated commands"], small=True),
    ]), "Dynamic values use {{placeholders}}; element targets must be explicit.")

    slides["Prompts as Markdown"] = shell("Prompts as Markdown", "Prompt text is versioned", "Corrige el relato anterior: Cypress requiere {{token}} y no permite placeholders en targets. El campo del país usa una frase estática específica por mercado; preparePrompt detecta tokens faltantes antes de llamar a cy.prompt. Los tests Node de presupuesto fueron retirados a petición del dueño.", code("checkout.prompt.md · excerpt\n\n## completeCheckout\n- Add the Margherita pizza to the cart from the catalog page\n- Enter {{address}} into the address field\n- [requiredField]\n- Click the cash payment option\n- Confirm the order\n\n## requiredFieldMX\n- Enter {{requiredFieldValue}} into the colonia (neighborhood) field"), "Country-specific target, runtime-only value; preparePrompt checks placeholder names.")

    slides["Demo Backup: Commands"] = shell("Demo Backup: Commands", "Rehearsed locator mutation", "Estos son comandos PowerShell de respaldo para un caso, C9. La mutación cambia el data-testid real en el DOM; el registro sigue intacto. El primer comando falla con retries 0 y el segundo pasa usando el fallback cosechado. No correr ambos en paralelo contra la app compartida.", code("# Fail: app DOM changes; registry keeps the old selector\npnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature `\n  --env 'tags=@C9' --expose 'MUTATE_DOM=checkout.address' --config 'retries=0'\n\n# Pass: same mutation, harvested a11y fallback enabled\npnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature `\n  --env 'tags=@C9' --expose 'MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y' `\n  --config 'retries=0'"), "Deterministic healing is live-verified; cy.prompt's response to this mutation is untested.")

    slides["TestRail Bulk Reporting"] = shell("TestRail Bulk Reporting", "One run, three bulk requests", "TestRailObserver es RunObserver opcional, suscrito a after:run cuando TESTRAIL_URL existe. Lee @C del feature, mapea resultados, usa add_run, add_results_for_cases y close_run. Adjuntar screenshots es opcional y agregaría peticiones. Si TestRail falla, lo registra pero el exit code de Cypress no cambia.", grid([
        card("after:spec", ["Normalize Cypress results", "Collect cases and attempts"], small=True),
        card("after:run", ["Map @C tags to TestRail IDs", "Submit passed/failed only"], small=True),
        card("3 bulk calls", ["add_run → add_results_for_cases → close_run", "Optional screenshot uploads add calls"], small=True),
    ], 3, 28), "Reporting never changes the test code or turns a passing Cypress run red.")

    slides["Cloud CLI"] = shell("Cloud CLI", "A lens into the recorded run", "Muestra el run 8 en Cloud. cy-cloud ofrece runs, tests, screenshots y timeline de Test Replay. La Record Key solo graba; la CLI requiere OAuth/PAT aparte y quizá activación por admin. pnpm cloud:status está instalado, pero autenticación sigue pendiente; usa la UI si no se activa antes de la charla.", grid([
        card("Human + agent", ["pnpm cloud:status", "pnpm cloud:runs", "cy-cloud replay timeline …"], small=True),
        card("Authentication boundary", ["CYPRESS_RECORD_KEY records tests", "CYPRESS_CLOUD_TOKEN or login authorizes CLI", "Organization integration may need enabling"], small=True),
    ]), "Cloud run 8 passed; live CLI queries still require separate authentication.")

    slides["CI and Reporting"] = shell("CI and Reporting", "Pipeline and evidence paths", "El push activa tests.yml; el prompt suite es manual. Sólo una falla del pipeline determinista dispara claude-ci-triage.yml. Ese workflow reúne logs y screenshots, genera un veredicto JSON sin LLM y opcionalmente lo enriquece con Claude; puede rerun o comentar/crear issue. El issue gate estricto todavía está pendiente.", diagram("04-ci-and-triage.svg"), "The default suite and failure diagnosis run without a model secret.")

    slides["Demo Backup: Results"] = shell("Demo Backup: Results", "Rehearsal evidence", "Respaldo real, no placeholders: local Cloud run 7 aprobó 5/5 y TestRail R7 cerró con 5 passed; GitHub Actions cy.prompt suite pasó 5/5 en Cloud run 8. La suite determinista del mismo commit pasó en CI. Abre los links si el demo en vivo falla.", grid([
        card("Cloud run 7", ["Local recorded Checkout: 5 / 5", "TestRail R7: 5 passed, 0 failed"], small=True),
        card("Cloud run 8", ["GitHub Actions cy.prompt: 5 / 5", "Run 39306077680: success"], small=True),
        card("Deterministic CI", ["Run 39306055926: success", "Auth, Catalog, Checkout matrix"], small=True),
    ], 3, 28), "cloud.cypress.io/projects/5v45hh/runs/8 · GitHub Actions 39306077680")

    slides["What the Demo Proves"] = shell("What the Demo Proves", "Evidence, without overclaiming", "Separa hechos: un data-testid cambiado en la app fue tolerado por el fallback determinista; cy.prompt completó los cinco mercados con la app actual; el self-healing de cy.prompt para esa mutación concreta aún no se ensayó. Romper el registro de locators no es cambiar la app.", grid([
        card("Proven", ["Atomic API + UI Checkout works", "Deterministic fallback survives tested DOM mutation", "cy.prompt recorded run 8 passed five markets"], small=True),
        card("Not yet proven", ["cy.prompt self-heals this specific mutation", "Pre-run TestRail case reader", "Strict product-bug issue gate"], accent="#E5B867", small=True),
    ]), "The talk distinguishes selector fallback, AI generation, and AI self-healing.")

    slides["Agentic Boundaries"] = shell("Agentic Boundaries", "What remains to build", "El plan local propone un lector get_case y un solo escenario permitido, luego un gate para publicar únicamente regresiones de producto reproducidas. El workflow actual genera diagnóstico determinista y Claude es opcional; aún puede crear issues para categorías no regresión. AGENTS.md y copilot-instructions.md amplían la guía a Codex y Copilot.", grid([
        card("Current", ["Model-free CI verdict; optional Claude enrichment", "AGENTS.md for Codex + Copilot adapter", "Case IDs and TestRail result writer"], small=True),
        card("Proposed", ["get_case preflight + allowlisted dispatch", "Repeat business failure before issue", "Deduplicate by case + signature"], accent="#E5B867", small=True),
    ]), "The bounded model diagnosis does not own the oracle or the final publication policy.")

    slides["Takeaways"] = shell("Takeaways", "Four ideas to take home", "Cierra con cuatro ideas: API para arrange, UI sólo necesaria, oráculo acotado, agentes con límites y evidencia. No afirmes que las pruebas Node siguen activas: fueron retiradas.", grid([
        card("01 · Atomic", ["API arranges state; UI proves its rendering"], small=True),
        card("02 · Bounded", ["At most one API claim and one UI claim"], small=True),
        card("03 · Guarded", ["Hooks protect the contract; skills guide the agent"], small=True),
        card("04 · Observable", ["TestRail, Cloud, Graphify, and CI show evidence"], small=True),
    ]), "Master your willpower… and your suite.")

    return slides


def main():
    original = BASE.read_text(encoding="utf-8")
    matches = list(SECTION.finditer(original))
    assert len(matches) == 27, f"Expected 27 original slides, got {len(matches)}"
    preserved = {match.group(1): match.group(0) for match in matches}
    assert len(preserved) == len(matches), "Original slide labels must be unique"
    slides = make_new_slides()

    # Keep the presentation's Green Lantern framing and the existing product screenshots.
    preserved["Title"] = preserved["Title"].replace(
        "A Green Lantern Architecture for Cypress API + Web",
        "Atomic testing and a guarded agentic workflow for Cypress API + Web",
    )
    preserved["OmniPizza"] = preserved["OmniPizza"].replace(
        "SYSTEM UNDER TEST", "WORLD PREMIERE · SYSTEM UNDER TEST"
    ).replace(
        "Habla de OmniPizza: la plataforma que desarrollaste como sistema bajo prueba.",
        "Debut mundial, minuto 1 de 6: presenta OmniPizza como plataforma real bajo prueba."
    )
    preserved["OmniPizza Desktop"] = preserved["OmniPizza Desktop"].replace(
        "Recorre las pantallas web:", "Debut mundial, minutos 2–4 de 6. Recorre las pantallas web:"
    ).replace(
        "tracking en vivo", "estado del pedido mostrado"
    )
    preserved["OmniPizza Mobile + API"] = preserved["OmniPizza Mobile + API"].replace(
        "Misma app en móvil:", "Debut mundial, minutos 5–6 de 6. Misma app en móvil:"
    )
    preserved["Demo Time"] = preserved["Demo Time"].replace(
        "Plan: romper un locator con BREAK_LOCATOR y correr las dos estrategias sobre el mismo feature file.",
        "Demo de 20 minutos: C9, mutación del DOM, fallback determinista, cy.prompt grabado, TestRail, Cloud y CI."
    ).replace(
        "Same feature file. One broken selector. Two strategies.",
        "C9 · DOM mutation · TestRail · Cloud · bounded agents."
    )
    preserved["AtomicScenario"] = preserved["AtomicScenario"].replace(
        "Asserts the API contract itself: status, schema, business rule.",
        "Creates the API state and makes at most one contract claim."
    )

    order = [
        "Title", "Speaker", "Agenda", "The Problem", "The Oath",
        "OmniPizza", "OmniPizza Desktop", "OmniPizza Mobile + API",
        "System Architecture", "Anatomy", "AtomicScenario", "Code: AtomicScenario",
        "Assertion Budget", "Claims vs Guards", "Hydration", "Checkout Hydration",
        "Limits of Injection", "Six-Level Case Ladder", "Guardrails", "Official Skills",
        "Subagents and Graphify", "Demo Time", "Live Demo Route", "Two Strategies",
        "cy.prompt Basics", "Prompts as Markdown", "Demo Backup: Commands",
        "TestRail Bulk Reporting", "Cloud CLI", "CI and Reporting", "Demo Backup: Results",
        "What the Demo Proves", "Agentic Boundaries", "Takeaways", "Thank You",
    ]
    resolved = {**preserved, **slides}
    missing = [label for label in order if label not in resolved]
    assert not missing, f"Missing slides: {missing}"
    assert len(order) == len(set(order)), "Duplicate slide labels in order"
    assembled = original[:matches[0].start()] + "\n\n".join(resolved[label] for label in order) + original[matches[-1].end():]
    assert assembled.count("<section ") == len(order)
    assert "PART TWO" not in assembled
    assert "100-prompt/hour" not in assembled
    assert "Drop the failing-run screenshot" not in assembled

    bundle = INDEX.read_text(encoding="utf-8")
    match = TEMPLATE.search(bundle)
    assert match, "Bundled template script missing"
    encoded = json.dumps(assembled, ensure_ascii=False).replace("</", "<\\u002F")
    updated = bundle[:match.start(2)] + encoded + bundle[match.end(2):]
    INDEX.write_text(updated, encoding="utf-8")
    Path(__file__).with_name("deck-preview.html").write_text(assembled, encoding="utf-8")
    print(f"Built {len(order)} slides into {INDEX}")


if __name__ == "__main__":
    main()
