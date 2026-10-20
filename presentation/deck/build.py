"""Rebuild the bundled slide deck while preserving its original asset manifest.

The original Design export is kept as deck-base.html. This script selects and
rewrites its sections, embeds local SVG diagrams, and replaces only the bundled
template string in docs/index.html. Images and fonts in the manifest stay intact.
"""

import base64
import json
import re
from html import escape, unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).with_name("deck-base.html")
INDEX = ROOT / "docs" / "index.html"
ARCH = ROOT / "presentation" / "architecture"
EVIDENCE = ROOT / "presentation" / "deck" / "evidence"
OPENING_VIDEO_SCRIPT = Path(__file__).with_name("opening-video.js")
SPEAKER_NOTES = ROOT / "docs" / "speaker-notes.md"
SECTION = re.compile(r'<section data-label="([^"]+)"[^>]*>.*?</section>', re.S)
TEMPLATE = re.compile(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', re.S)
SPEAKER_SECTION = re.compile(r'^### \d{2} · ([^\n]+)\n(.*?)(?=^### |^## |\Z)', re.M | re.S)
SPEAKER_LINE = re.compile(r'^\*\*Say:\*\* “([^\n]+)”$', re.M)
SPEAKER_DO = re.compile(r'^\*\*Do:\*\* ([^\n]+)$', re.M)
STAGE_CUE_SLIDES = {"Opening Video", "Demo Time", "Live Demo Route", "Demo Backup: Commands", "Cloud CLI"}


def load_spoken_notes():
    if SPEAKER_NOTES.exists():
        guide = SPEAKER_NOTES.read_text(encoding="utf-8-sig")
        spoken = {}
        for label, body in SPEAKER_SECTION.findall(guide):
            line = SPEAKER_LINE.search(body)
            assert line, f"Missing Say line for {label}"
            assert label not in spoken, f"Duplicate speaker notes for {label}"
            note = line.group(1)
            if label in STAGE_CUE_SLIDES:
                cue = SPEAKER_DO.search(body)
                assert cue, f"Missing Do line for {label}"
                note += f" Stage cue: {cue.group(1)}"
            spoken[label] = note
        return spoken

    # The private guide is optional. A clean checkout keeps the English notes
    # embedded in the published deck, so rebuilding does not need that file.
    bundle = INDEX.read_text(encoding="utf-8")
    match = TEMPLATE.search(bundle)
    assert match, "Bundled template script missing"
    current_deck = json.loads(match.group(2))
    spoken = {}
    for slide in SECTION.finditer(current_deck):
        line = re.search(r'data-speaker-notes="([^"]*)"', slide.group(0))
        assert line, f"Missing speaker note in {slide.group(1)}"
        spoken[slide.group(1)] = unescape(line.group(1))
    return spoken


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
    mime = "image/png" if name.lower().endswith(".png") else "image/svg+xml"
    return f'<img alt="{text(name)}" src="data:{mime};base64,{encoded}" style="display: block; width: 100%; height: 100%; object-fit: contain;"/>'


def evidence_image(name, alt):
    encoded = base64.b64encode((EVIDENCE / name).read_bytes()).decode("ascii")
    return f'<img alt="{text(alt)}" src="data:image/png;base64,{encoded}" style="display: block; width: 100%; height: 100%; object-fit: contain;"/>'


def evidence_panel(name, alt, caption):
    return f'<figure style="margin: 0; background: #101713; border: 2px solid #31583B; padding: 12px; display: flex; flex-direction: column; min-width: 0; min-height: 0;"><div style="flex: 1; min-height: 0;">{evidence_image(name, alt)}</div><figcaption style="padding: 8px 12px 2px; color: #B8D2BE; font: 20px JetBrains Mono,monospace;">{text(caption)}</figcaption></figure>'


CODE_TOKEN = re.compile(
    r"(?P<placeholder>\{\{[A-Za-z_][A-Za-z_0-9]*\}\})"
    r"|(?P<comment>//[^\n]*|#[^\n]*)"
    r"|(?P<string>'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\")"
    r"|(?P<flag>--[A-Za-z][A-Za-z-]*)"
    r"|(?P<word>\b[A-Za-z_][A-Za-z_0-9]*\b)"
    r"|(?P<number>\b\d+\b)"
)
CODE_COLORS = {
    "placeholder": "#B7F56B",
    "comment": "#719A75",
    "string": "#D9F59A",
    "flag": "#7EE9C4",
    "function": "#72E7B2",
    "keyword": "#38F443",
    "number": "#E5D98A",
}
CODE_KEYWORDS = {"AtomicScenario", "arrangeViaApi", "hydrateUi", "assertUi", "const", "let", "return", "pnpm", "cy", "prompt"}


def highlighted_line(line, language):
    if language == "markdown" and line.startswith("## "):
        return f'<span style="color: {CODE_COLORS["keyword"]}; font-weight: 700;">{text(line)}</span>'

    parts = []
    cursor = 0
    for match in CODE_TOKEN.finditer(line):
        parts.append(text(line[cursor:match.start()]))
        kind = match.lastgroup
        token = match.group()
        if kind == "placeholder":
            inner = token[2:-2]
            color = CODE_COLORS.get("placeholder")
            parts.append(f'<span style="color: {color};"><span>&#123;</span><span>&#123;</span>{text(inner)}<span>&#125;</span><span>&#125;</span></span>')
            cursor = match.end()
            continue
        if language == "markdown" and kind == "comment":
            kind = "keyword" if token == "#" else None
        if kind == "word":
            kind = "keyword" if token in CODE_KEYWORDS else "function" if line[match.end():].startswith("(") else None
        color = CODE_COLORS.get(kind)
        parts.append(f'<span style="color: {color};">{text(token)}</span>' if color else text(token))
        cursor = match.end()
    parts.append(text(line[cursor:]))
    return "".join(parts)


def code(lines, language="typescript"):
    formatted_lines = []
    for line in lines.split("\n"):
        if not line:
            formatted_lines.append('<div style="min-height: 1.46em;"><br/></div>')
        else:
            formatted_lines.append(f'<div style="min-height: 1.46em;">{highlighted_line(line, language)}</div>')
    body = "".join(formatted_lines)
    return f'<pre style="margin: 0; background: #060B07; border: 1px solid #31583B; border-left: 9px solid #38F443; box-shadow: inset 0 0 0 1px #102A16, 0 18px 44px #0009; padding: 34px 44px; color: #F1F8EF; font: 26px/1.46 JetBrains Mono,monospace; white-space: pre-wrap; overflow: hidden;">{body}</pre>'


def make_new_slides():
    slides = {}

    slides["Opening Video"] = '''<section data-label="Opening Video" data-speaker-notes="Play the opening video from 00:36, then advance to the title." style="background: #000; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
  <video data-start-time="36" src="media/opening.mp4#t=36" type="video/mp4" controls playsinline preload="metadata" style="width: 100%; height: 100%; object-fit: contain; background: #000;">Your browser does not support MP4 video.</video>
  <div style="position: absolute; right: 36px; top: 30px; z-index: 10; display: flex; gap: 12px;">
    <button type="button" data-video-action="toggle" style="background: #0a2316ee; color: #fff; border: 2px solid #77ff8c; border-radius: 12px; padding: 15px 22px; font: 700 22px JetBrains Mono,monospace; cursor: pointer;">Play with sound</button>
    <button type="button" data-video-action="restart" style="background: #0a2316ee; color: #fff; border: 2px solid #77ff8c; border-radius: 12px; padding: 15px 22px; font: 700 22px JetBrains Mono,monospace; cursor: pointer;">Restart at 00:36</button>
  </div>
</section>'''

    agenda = grid([
        card("01 · World premiere", ["OmniPizza: five markets, Web, Mobile, and OpenAPI"], small=True),
        card("02 · Atomic foundations", ["API arrange, UI hydrate, two-claim budget"], small=True),
        card("03 · Guarded agents", ["Case ladder, hooks, skills, MCP, Graphify"], small=True),
        card("04 · Live demo", ["TestRail, selector healing, cy.prompt, Cloud, triage"], small=True),
    ])
    slides["Agenda"] = shell("Agenda", "The story", "Cuatro actos: OmniPizza, fundamentos atómicos, agentes con límites y demo en vivo. cy.prompt vive dentro del demo.", agenda, "A real system first; then the test architecture; then the agent at work.")

    slides["System Architecture"] = shell("System Architecture", "The system under the test system", "Muestra el mapa actual: GitHub Actions ejecuta Cypress sin LLM; OmniPizza es el sistema bajo prueba; TestRail y Cloud son salidas opcionales. El triage determinista funciona sin clave de modelo.", diagram("01-current-architecture.svg"), "The executable core runs without an LLM; agent adapters are optional.")

    rungs = [
        card("1 · Gherkin", ["checkout.feature", "@C8 tags the outline; @market_mx selects Mexico"], small=True),
        card("2 · Step definition", ["checkout.steps.ts", "Maps market data; calls runCheckoutScenario"], small=True),
        card("3 · Template Method", ["AtomicScenario", "arrangeViaApi → hydrateUi → assertUi"], small=True),
        card("4 · Facade", ["CheckoutFacade", "Keeps domain actions and API contract together"], small=True),
        card("5 · UI strategy", ["Deterministic locator path or cy.prompt", "Only necessary UI actions"], small=True),
        card("6 · Claims", ["assert* methods", "At most one API + one rendered UI claim"], small=True),
    ]
    slides["Six-Level Case Ladder"] = shell("Six-Level Case Ladder", "Build one case, six rungs", "Recorre la fila de México en C8. @C8 identifica el caso BDD y @market_mx selecciona esa fila para la ejecución local. El escenario versionado decide qué correr; la aserción vive en assert*.", grid(rungs, 3, 24), "The versioned scenario owns execution; TestRail supplies the case identity.")

    slides["Code: AtomicScenario"] = shell("Code: AtomicScenario", "The Template Method in code", "Fragmento abreviado de checkout.steps.ts. AtomicScenario fija el orden arrangeViaApi, hydrateUi y assertUi; el step definition conecta datos y fachadas. El claim API ocurre dentro de arrangeViaApi y el claim UI en assertUi.", code("// checkout.steps.ts · abridged\nAtomicScenario.for('checkout').run({\n  arrangeViaApi: () => {\n    // seedCartViaApi → checkoutViaApi\n    checkoutFacade.assertOrderCreated(order);\n  },\n  hydrateUi: () => {\n    authFacade.loginViaUiWithMarket('standard', market);\n    checkoutFacade.completeCheckoutViaUi(checkoutData);\n  },\n  assertUi: () =>\n    checkoutFacade.assertOrderConfirmation(expectedOrder),\n});"), "The class fixes the phase order; the facade and strategy own the behavior.")

    slides["Guardrails"] = shell("Guardrails", "The agent has a fence", "AGENTS.md define el contrato. Los scripts guard-oracle y guard-bash bloquean operaciones cuando el host los conecta a sus hooks. En Claude Code esto ya está configurado; otros hosts necesitan su propia integración. La autorización explícita del dueño prevalece en esta sesión.", grid([
        card("AGENTS.md", ["Assertion budget, ownership, and allowed edits", "One spec at a time; pnpm-only workflow"], small=True),
        card("guard-oracle", ["Denies edits to .feature contracts", "Denies changes to assert* claims and assertions"], small=True),
        card("guard-bash", ["Denies agent-issued --record / cy.prompt", "Denies git push and protected commands"], small=True),
        card("Human-owned boundary", ["The owner authorizes Cloud and external writes", "A denied oracle edit is not a repair"], small=True),
    ]), "Connect the policy scripts to your agent host for automatic blocking.")

    slides["Agent Architecture"] = f'''<section data-label="Agent Architecture" data-speaker-notes="Este mapa de Archify separa al asistente del runner: Cualquier agente con acceso al repositorio sigue AGENTS.md; los skills guían al asistente; los roles compartidos describen triage y reparación; los hooks se conectan según el host; Cypress ejecuta las pruebas y cy.prompt es una estrategia opcional de runtime." style="position: relative; background: #080e1d; color: #F1F8EF; font-family: Archivo,sans-serif; overflow: hidden;">
  {diagram("06-agent-workflow-archify.png")}
  <div style="position: absolute; left: 65px; top: 40px; background: #080e1de8; padding: 10px 24px 14px 0;"><span style="color: #38F443; font: 700 22px JetBrains Mono,monospace; letter-spacing: 2px;">AGENT ARCHITECTURE</span><h2 style="margin: 6px 0 0; font-size: 52px; line-height: 1;">One harness, optional assistants</h2></div>
  <a href="agent-architecture.html" target="_blank" rel="noopener" style="position: absolute; right: 78px; bottom: 42px; color: #9BF9B0; font: 700 22px JetBrains Mono,monospace; text-decoration: underline; background: #080e1de8; padding: 10px 14px;">Explore the interactive map ↗</a>
</section>'''

    slides["Official Skills"] = shell("Official Skills", "Five skills, five moments", "Los skills son instrucciones para el asistente. cypress-tap inspecciona la sesión abierta y el DOM real; cloud-cli consulta evidencia grabada; author crea o arregla tests; explain revisa sin editar; docs busca la fuente oficial. Son cinco capacidades, no cinco agentes autónomos.", grid([
        card("cypress-tap", ["When: a local spec is red", "Output: live DOM + failing command", "Action: red → green in cypress open"], small=True),
        card("cypress-cloud-cli", ["When: a recorded run fails", "Output: tests, screenshots, Replay timeline", "Action: inspect remote evidence"], small=True),
        card("cypress-author", ["When: a test needs creation or repair", "Output: Cypress test changes", "Boundary: preserve the oracle"], small=True),
        card("cypress-explain", ["When: a test needs review", "Output: read-only explanation", "Action: clarify behavior and risks"], small=True),
        card("cypress-docs", ["When: an API or feature is uncertain", "Output: official Cypress references", "Action: verify before changing code"], small=True),
    ], 3, 20), "A skill changes how the assistant works; it is not a Cypress test command.")

    slides["MCP Evidence"] = shell("MCP Evidence", "Evidence through MCP tools", "MCP ofrece herramientas al asistente. En .mcp.json están declarados Cypress Cloud y GitHub Actions en modo de solo lectura. La autenticación PAT de cy-cloud se comprobó con pnpm cloud:status y se consultaron runs; eso no prueba que el host MCP haya conectado. El token CYPRESS_MCP_TOKEN se configura por separado. El auditor PostToolUse registra llamadas MCP en Claude Code. TestRail hoy publica por HTTP; su MCP oficial para Cloud figura en beta cerrada y aún no es una integración de este repo.", grid([
        card("Cypress Cloud MCP · configured", ["Runs, failed tests, flakes, Replay links", "Remote evidence for cy-triage", "PAT via CYPRESS_MCP_TOKEN or host OAuth"], small=True),
        card("GitHub MCP · configured", ["Actions read-only endpoint", "CI jobs, logs, artifacts", "No issue or workflow writes in this setup"], small=True),
        card("TestRail MCP · candidate", ["Official Cloud server: closed beta", "Potential read-only C8 and R10 lookup", "Keep .feature and assert* as oracle"], small=True),
    ], 3, 24), "MCP gives the agent tools; the versioned tests and CI still decide pass or fail.")

    slides["Skills vs cy.prompt"] = shell("Skills vs cy.prompt", "Two different instruction layers", "Contrasta tiempos y destinatarios. Los skills de cypress-io/ai-toolkit guían al asistente cuando escribe, explica o diagnostica. checkout.prompt.md contiene pasos de UI del test; preparePrompt valida y rellena placeholders; cy.prompt consume esos pasos durante la corrida grabada y usa Cypress Cloud. El contrato Gherkin y las aserciones permanecen versionados.", grid([
        card("Agent skill", ["Audience: coding assistant", "Time: authoring or diagnosis", "Input: SKILL.md + tools", "Result: inspect, explain, or edit code"], small=True),
        card("checkout.prompt.md", ["Audience: Cypress strategy", "Time: test execution", "Input: UI steps + {{placeholders}}", "Result: prepared runtime instructions"], small=True),
        card("cy.prompt()", ["Audience: Cypress Cloud AI", "Time: optional recorded run", "Input: prepared steps + current UI", "Result: browser actions and confirmation"], small=True),
    ], 3, 24), "Skills guide the builder. cy.prompt drives the browser during an opted-in test run.")

    slides["Subagents and Graphify"] = shell("Subagents and Graphify", "Diagnose, repair, understand", "Distingue subagentes de la ruta CI: cy-triage y cy-fixer son herramientas locales con permisos distintos. Graphify es un mapa estático local, snapshot de 634 nodos, 1,368 aristas y 24 comunidades; no llama a una API de pago para esta extracción.", grid([
        card("cy-triage role", ["Read-only evidence review", "JSON verdict: cause, confidence, evidence"], small=True),
        card("cy-fixer role", ["Fix steps, strategies, or selectors", "At most five red → green iterations"], small=True),
        card("Graphify local graph", ["634 nodes · 1,368 edges · 24 communities", "Hubs: SelectorSource, CountryCode, TestResult"], small=True),
    ], 3, 28), "The agent can navigate dependencies without scanning every file or paying for graph extraction.")

    slides["Live Demo Route"] = shell("Live Demo Route", "Four scenes, one flow", "El demo tiene cuatro escenas. 1: C8 y su fila de México, una ejecución local breve y luego los 12 escenarios. 2: mutación real del DOM y fallback determinista. 3: Checkout con cy.prompt y corrida grabada. 4: TestRail R10, Cloud, pipeline y diagnóstico. Cypress Cloud MCP se muestra sólo si el host tiene la conexión activa; el CLI autenticado sirve de ruta reproducible. get_case y el issue gate estricto se muestran como futuro.", grid([
        card("1 · Case identity", ["Show TestRail C8 and @market_mx in Gherkin", "Run Mexico locally, then all 12 scenarios"], small=True),
        card("2 · UI change", ["MUTATE_DOM breaks a real data-testid", "HEAL_LOCATORS=a11y selects a unique fallback"], small=True),
        card("3 · AI Checkout", ["Switch to CyPromptCheckoutUiStrategy", "Open recorded Cloud run 8: 5/5 passed"], small=True),
        card("4 · Evidence", ["Inspect current TestRail R10 and CI artifacts", "Query Cloud with MCP or authenticated CLI"], small=True),
    ]), "CLI run listing is verified; an MCP query needs an active host connection.")

    slides["Two Strategies"] = shell("Two Strategies", "Same case, two UI engines", "La estrategia se elige en cypress/support/e2e.ts mediante UI_STRATEGY. El step definition y el oráculo no cambian. El fallback determinista y el self-healing de cy.prompt son mecanismos distintos.", grid([
        card("Deterministic", ["LocatorProxy → cy.get()", "Optional harvested a11y fallback", "No AI call"], small=True),
        card("cy.prompt", ["Natural-language steps against rendered UI", "Cypress Cloud recording", "Two calls per Checkout scenario"], small=True),
    ]), "createCheckoutFacade() selects the CheckoutUiStrategy; the .feature stays the same.")

    slides["cy.prompt Basics"] = shell("cy.prompt Basics", "AI Checkout, inside the demo", "El prompt no reemplaza el contrato Gherkin. Dos llamadas por escenario, hasta diez para cinco mercados. La imagen muestra los cinco resultados reales de Cloud run 8, consultados con cy-cloud y presentados como captura de datos de la CLI.", f'<div style="display: grid; grid-template-columns: 1fr 1.55fr; gap: 28px; height: 100%;">{grid([card("Two calls per market", ["Complete Checkout", "Verify confirmation", "Up to 10 calls for five markets"], small=True)], 1)}{evidence_panel("cypress-cloud-run-8.png", "Cypress Cloud CLI run 8 with five Checkout tests passed", "Cypress Cloud CLI · run 8 · 5 passed")}</div>', "Cloud run 8: cloud.cypress.io/projects/5v45hh/runs/8")

    slides["Prompts as Markdown"] = shell("Prompts as Markdown", "Prompt text is versioned", "Corrige el relato anterior: Cypress requiere {{token}} y no permite placeholders en targets. El campo del país usa una frase estática específica por mercado; preparePrompt detecta tokens faltantes antes de llamar a cy.prompt. Los tests Node de presupuesto fueron retirados a petición del dueño.", code("checkout.prompt.md · excerpt\n\n## completeCheckout\n- Add the Margherita pizza to the cart from the catalog page\n- Enter {{address}} into the address field\n- [requiredField]\n- Click the cash payment option\n- Confirm the order\n\n## requiredFieldMX\n- Enter {{requiredFieldValue}} into the colonia (neighborhood) field", "markdown"), "Country-specific target, runtime-only value; preparePrompt checks placeholder names.")

    slides["Demo Backup: Commands"] = shell("Demo Backup: Commands", "Rehearsed locator mutation", "Estos son comandos PowerShell de respaldo para la fila de México en C8. La mutación cambia el data-testid real en el DOM; el registro sigue intacto. El primer comando falla con retries 0 y el segundo pasa usando el fallback cosechado. No correr ambos en paralelo contra la app compartida.", code("# Fail: app DOM changes; registry keeps the old selector\npnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature `\n  --env 'tags=@market_mx' --expose 'MUTATE_DOM=checkout.address' --config 'retries=0'\n\n# Pass: same mutation, harvested a11y fallback enabled\npnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature `\n  --env 'tags=@market_mx' --expose 'MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y' `\n  --config 'retries=0'", "powershell"), "Deterministic healing is live-verified; cy.prompt's response to this mutation is untested.")

    slides["TestRail Bulk Reporting"] = shell("TestRail Bulk Reporting", "One run, three bulk requests", "TestRailObserver publica en after:run. Esta imagen muestra una vista generada con datos reales de la API de TestRail: R7 cerrado, C8–C12 passed. No es una captura de la interfaz web. El flujo usa add_run, add_results_for_cases y close_run; adjuntar screenshots agregaría peticiones.", f'<div style="display: grid; grid-template-columns: 1.55fr 1fr; gap: 28px; height: 100%;">{evidence_panel("testrail-r7-api.png", "TestRail API run R7 closed with cases C8 to C12 passed", "Historical R7 · API snapshot · 5 passed")}{grid([card("after:spec", ["Collect case results"], small=True), card("after:run", ["Map @C tags to IDs"], small=True), card("3 bulk calls", ["Create → submit → close"], small=True)], 1, 14)}</div>', "TestRail reporting does not change the Cypress result.")

    slides["Cloud CLI"] = f'''<section data-label="Cloud CLI" data-speaker-notes="Captura real de la interfaz de Cypress Cloud facilitada por el dueño. Señala el run 8 en la primera fila: cinco tests pasaron y cero fallaron. Luego abre el run para enseñar tests y Replay. pnpm cloud:status confirmó autenticación por PAT y pnpm cloud:runs listó las corridas el 19 de octubre de 2026. La captura es de la interfaz web; esa comprobación no valida la conexión MCP." style="background: var(--bg); color: var(--ink); font-family: Archivo,sans-serif; display: flex; flex-direction: column; box-sizing: border-box; padding: 48px 58px; gap: 18px;">
  <div><span style="color: var(--green); font: 700 22px JetBrains Mono,monospace; letter-spacing: 2px;">CYPRESS CLOUD · RECORDED EXECUTIONS</span><h2 style="font-size: 56px; line-height: 1.05; margin: 10px 0 0;">Run 8: five Checkout tests passed</h2></div>
  <div style="flex: 1; min-height: 0; border: 2px solid #31583B; background: #101713; padding: 8px;">{evidence_image("cypress-cloud-runs-ui.png", "Cypress Cloud Runs page showing run 8 with five passed tests")}</div>
  <div style="color: var(--mut); font: 21px JetBrains Mono,monospace;">Cypress Cloud UI · project 5v45hh · historical run 8 · 5 passed / 0 failed</div>
</section>'''

    slides["CI and Reporting"] = shell("CI and Reporting", "Pipeline and evidence paths", "El push activa tests.yml; el prompt suite es manual. Sólo una falla del pipeline determinista dispara ci-triage.yml. Ese workflow reúne logs y screenshots, genera un veredicto JSON sin LLM; puede rerun o comentar/crear issue. El issue gate estricto todavía está pendiente.", diagram("04-ci-and-triage.svg"), "The default suite and failure diagnosis run without a model secret.")

    slides["Demo Backup: Results"] = shell("Demo Backup: Results", "Rehearsal evidence", "Evidencia histórica: R7 cerró con cinco casos passed según la API de TestRail; Cloud run 8 contiene cinco pruebas Checkout passed según la CLI. Ambas imágenes son capturas de datos consultados, no de las interfaces web.", f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; height: 100%;">{evidence_panel("testrail-r7-api.png", "TestRail API results for historical run R7", "TestRail API · R7 · five passed")}{evidence_panel("cypress-cloud-run-8.png", "Cypress Cloud CLI results for historical run 8", "Cypress Cloud CLI · run 8 · five passed")}</div>', "Historical evidence · Cloud run 8: cloud.cypress.io/projects/5v45hh/runs/8")

    slides["What the Demo Proves"] = shell("What the Demo Proves", "Evidence, without overclaiming", "Separa hechos: un data-testid cambiado en la app fue tolerado por el fallback determinista; cy.prompt completó los cinco mercados con la app actual; el self-healing de cy.prompt para esa mutación concreta aún no se ensayó. Romper el registro de locators no es cambiar la app.", grid([
        card("Proven", ["Atomic API + UI Checkout works", "Deterministic fallback survives tested DOM mutation", "cy.prompt recorded run 8 passed five markets"], small=True),
        card("Not yet proven", ["cy.prompt self-heals this specific mutation", "Pre-run TestRail case reader", "Strict product-bug issue gate"], accent="#E5B867", small=True),
    ]), "The talk distinguishes selector fallback, AI generation, and AI self-healing.")

    slides["Agentic Boundaries"] = shell("Agentic Boundaries", "What remains to build", "El plan local propone un lector get_case y un solo escenario permitido, luego un gate para publicar únicamente regresiones de producto reproducidas. El workflow actual genera diagnóstico determinista; aún puede crear issues para categorías no regresión. AGENTS.md y agent/roles son instrucciones comunes para cualquier asistente.", grid([
        card("Current", ["Deterministic CI verdict; no model secret", "AGENTS.md + shared agent roles", "Case IDs and TestRail result writer"], small=True),
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
        "Debut mundial: presenta OmniPizza como plataforma real bajo prueba."
    )
    preserved["OmniPizza Desktop"] = preserved["OmniPizza Desktop"].replace(
        "Recorre las pantallas web:", "Debut mundial. Recorre las pantallas web:"
    ).replace(
        "tracking en vivo", "estado del pedido mostrado"
    )
    preserved["OmniPizza Mobile + API"] = preserved["OmniPizza Mobile + API"].replace(
        "Misma app en móvil:", "Debut mundial. Misma app en móvil:"
    )
    preserved["Demo Time"] = preserved["Demo Time"].replace(
        "Plan: romper un locator con BREAK_LOCATOR y correr las dos estrategias sobre el mismo feature file.",
        "Demo en vivo: C8, ejecución local, mutación del DOM, fallback determinista, cy.prompt grabado, TestRail, Cloud y CI."
    ).replace(
        "Same feature file. One broken selector. Two strategies.",
        "C8 · local run · DOM mutation · TestRail · Cloud · bounded agents."
    )
    preserved["AtomicScenario"] = preserved["AtomicScenario"].replace(
        "Asserts the API contract itself: status, schema, business rule.",
        "Creates the API state and makes at most one contract claim."
    )
    contact_old = (
        '<span style="font-weight: 700;">Gilberto Sánchez · Mexitester</span>\n'
        '      <span>linkedin.com/in/gilberto-sanchez-mares-26001858</span>\n'
        '      <span>gilsanchezts@outlook.com</span>\n'
        '      <span>gsanchezm.github.io/OmniPizza</span>'
    )
    contact_new = (
        '<span style="font-weight: 700;">Gilberto Sánchez · Mexitester</span>\n'
        '      <span>github.com/gsanchezm/cypress-conf-2026</span>\n'
        '      <span>gsanchezm.github.io/OmniPizza</span>\n'
        '      <span>linkedin.com/in/gilberto-sanchez-mares-26001858</span>\n'
        '      <span>gilsanchezts@outlook.com</span>'
    )
    assert preserved["Thank You"].count(contact_old) == 1
    preserved["Thank You"] = preserved["Thank You"].replace(contact_old, contact_new)

    order = [
        "Opening Video", "Title", "Speaker", "Agenda", "The Problem", "The Oath",
        "OmniPizza", "OmniPizza Desktop", "OmniPizza Mobile + API",
        "System Architecture", "Anatomy", "AtomicScenario", "Code: AtomicScenario",
        "Assertion Budget", "Claims vs Guards", "Hydration", "Checkout Hydration",
        "Limits of Injection", "Six-Level Case Ladder", "Guardrails", "Agent Architecture", "Official Skills", "MCP Evidence", "Skills vs cy.prompt",
        "Subagents and Graphify", "Demo Time", "Live Demo Route", "Two Strategies",
        "cy.prompt Basics", "Prompts as Markdown", "Demo Backup: Commands",
        "TestRail Bulk Reporting", "Cloud CLI", "CI and Reporting", "Demo Backup: Results",
        "What the Demo Proves", "Agentic Boundaries", "Takeaways", "Thank You",
    ]
    resolved = {**preserved, **slides}
    spoken = load_spoken_notes()
    assert set(spoken) == set(order), "Speaker guide must cover exactly the slides in the deck"
    for label in order:
        section = resolved[label]
        assert 'data-speaker-notes="' in section, f"Missing speaker note attribute in {label}"
        resolved[label] = re.sub(
            r'data-speaker-notes="[^"]*"',
            lambda _: f'data-speaker-notes="{text(spoken[label])}"',
            section,
            count=1,
        )
    missing = [label for label in order if label not in resolved]
    assert not missing, f"Missing slides: {missing}"
    assert len(order) == len(set(order)), "Duplicate slide labels in order"
    assembled = original[:matches[0].start()] + "\n\n".join(resolved[label] for label in order) + original[matches[-1].end():]
    assert assembled.count("</head>") == 1
    video_script = OPENING_VIDEO_SCRIPT.read_text(encoding="utf-8")
    assembled = assembled.replace("</head>", f"<script>{video_script}</script>\n</head>", 1)
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
