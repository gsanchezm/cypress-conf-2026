"""Render presentation diagrams as editable 16:9 SVGs.

Run from the repository root: python presentation/architecture/generate.py
The diagrams describe the current working tree; update the labels when the system changes.
"""

from html import escape
from pathlib import Path


OUT = Path(__file__).resolve().parent
BG = "#080B08"
PANEL = "#142018"
PANEL_2 = "#1C2E20"
WHITE = "#F3F7F3"
MUTED = "#BACABA"
CYAN = "#57DBB3"
GREEN = "#7FE990"
VIOLET = "#A3C5FF"
ORANGE = "#FFD070"
RED = "#FF7B85"
STROKE = "#35513B"


class Diagram:
    def __init__(self, title, subtitle, number, status):
        self.parts = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">',
            '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8AA9C9"/></marker></defs>',
            f'<rect width="1600" height="900" fill="{BG}"/>',
            f'<rect x="0" y="0" width="1600" height="8" fill="{GREEN}"/>',
        ]
        self.text(74, 76, title, 44, WHITE, 700)
        self.text(76, 113, subtitle, 22, MUTED)
        self.pill(1415, 44, status, ORANGE if status == "PROPOSED" else GREEN, 130)
        self.line(74, 137, 1526, 137, STROKE, 2)

    def text(self, x, y, value, size=23, color=WHITE, weight=400, anchor="start"):
        self.parts.append(
            f'<text x="{x}" y="{y}" fill="{color}" font-family="Segoe UI,Arial,sans-serif" '
            f'font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{escape(str(value))}</text>'
        )

    def lines(self, x, y, values, size=22, color=MUTED, gap=31, weight=400):
        for i, value in enumerate(values):
            self.text(x, y + gap * i, value, size, color, weight)

    def rect(self, x, y, w, h, fill=PANEL, stroke=STROKE, radius=24, dash=False):
        dash_attr = ' stroke-dasharray="11 9"' if dash else ""
        self.parts.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="2"{dash_attr}/>'
        )

    def card(self, x, y, w, h, heading, body, accent=CYAN, badge=None, dash=False, size=22):
        self.rect(x, y, w, h, PANEL, accent if dash else STROKE, dash=dash)
        self.rect(x, y, 8, h, accent, accent, radius=4)
        self.text(x + 27, y + 42, heading, 27, WHITE, 700)
        self.lines(x + 27, y + 79, body, size, MUTED, gap=31)
        if badge:
            self.pill(x + w - 136, y + 19, badge, accent, 112)

    def pill(self, x, y, label, color, width=130):
        self.rect(x, y, width, 34, "#233145", color, radius=17)
        self.text(x + width / 2, y + 24, label, 15, color, 700, "middle")

    def line(self, x1, y1, x2, y2, color=STROKE, width=2, dash=False):
        dash_attr = ' stroke-dasharray="8 8"' if dash else ""
        self.parts.append(
            f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{color}" stroke-width="{width}" '
            f'fill="none"{dash_attr}/>'
        )

    def arrow(self, points, color="#8AA9C9", dash=False, width=3):
        coordinates = " ".join(f"{x},{y}" for x, y in points)
        dash_attr = ' stroke-dasharray="9 8"' if dash else ""
        self.parts.append(
            f'<polyline points="{coordinates}" stroke="{color}" stroke-width="{width}" '
            f'fill="none" marker-end="url(#arrow)" stroke-linecap="round" '
            f'stroke-linejoin="round"{dash_attr}/>'
        )

    def circle(self, x, y, number, color):
        self.parts.append(f'<circle cx="{x}" cy="{y}" r="21" fill="{color}"/>')
        self.text(x, y + 8, str(number), 23, BG, 700, "middle")

    def save(self, name):
        (OUT / name).write_text("\n".join(self.parts + ["</svg>"]), encoding="utf-8")


def current_architecture():
    d = Diagram("System architecture today", "Versioned tests, live application, reporting, and an independent failure triage path", 1, "CURRENT")
    d.card(70, 186, 350, 154, "GitHub Actions", ["Push / PR: deterministic suite", "Manual: cy.prompt suite"], VIOLET)
    d.card(70, 370, 350, 170, "Repository", ["12 Gherkin cases with @C IDs", "Facades, strategies, locators", "Cypress + Cucumber"], CYAN)
    d.card(500, 244, 490, 249, "Cypress runner", ["API arrange → UI hydrate → UI claim", "Checkout: deterministic or cy.prompt", "after:spec + after:run events", "Mochawesome + GitHub summary"], CYAN)
    d.card(1070, 175, 450, 146, "OmniPizza", ["Live backend API + frontend UI", "Five market Checkout scenarios"], GREEN)
    d.card(1070, 353, 450, 147, "TestRail", ["C1–C12 map from Gherkin tags", "Optional run-level result publishing"], ORANGE)
    d.card(1070, 532, 450, 147, "Cypress Cloud", ["Optional recording; required by cy.prompt", "Run 8: 5 / 5 Checkout passed"], VIOLET)
    d.arrow([(420, 260), (460, 260), (460, 303), (500, 303)])
    d.arrow([(420, 453), (460, 453), (460, 420), (500, 420)])
    d.arrow([(990, 295), (1030, 295), (1030, 248), (1070, 248)], GREEN)
    d.arrow([(990, 390), (1030, 390), (1030, 426), (1070, 426)], ORANGE)
    d.arrow([(990, 449), (1010, 449), (1010, 605), (1070, 605)], VIOLET)
    d.card(70, 718, 1450, 95, "Separate failure path", ["Failed Actions run → logs/screenshots → deterministic verdict → optional Claude enrichment → rerun, comment, or issue"], RED, size=21)
    d.save("01-current-architecture.svg")


def case_lifecycle():
    d = Diagram("One case, two contracts", "The Gherkin tag identifies the TestRail case; the Cypress scenario remains the executable contract", 2, "CURRENT")
    d.card(70, 186, 315, 168, "TestRail case C9", ["Checkout / Mexico", "Human-readable case", "No pre-run read today"], ORANGE)
    d.card(460, 186, 400, 168, "checkout.feature", ["@C9 on Mexico Examples row", "Cucumber compiles this row", "Scenario selects MX test data"], CYAN)
    d.card(955, 186, 565, 168, "AtomicScenario", ["arrangeViaApi → hydrateUi → assertUi", "One API claim + one rendered UI claim"], GREEN)
    d.arrow([(385, 269), (460, 269)], ORANGE, dash=True)
    d.text(422, 249, "same C9", 15, ORANGE, 700, "middle")
    d.arrow([(860, 269), (955, 269)], CYAN)
    d.card(70, 435, 435, 155, "1  API arrange", ["Create and assert an API order", "Keep its computed total as oracle"], CYAN)
    d.card(582, 435, 435, 155, "2  UI hydrate", ["Log in; complete a second order", "Live frontend + backend interaction"], GREEN)
    d.card(1090, 435, 430, 155, "3  UI claim", ["Compare confirmation total", "against the API-derived total"], VIOLET)
    d.arrow([(505, 512), (582, 512)])
    d.arrow([(1017, 512), (1090, 512)])
    d.card(70, 657, 1450, 145, "After the run: TestRailObserver", ["after:spec collects results; after:run reads @C tags, maps passed/failed cases, calls add_run → add_results_for_cases → close_run.", "Requires TESTRAIL_URL; pending/skipped tests are not submitted. Publishing errors are logged without changing the Cypress exit code."], ORANGE, size=20)
    d.arrow([(1305, 590), (1305, 636), (1260, 636), (1260, 657)], ORANGE)
    d.save("02-case-to-result.svg")


def healing_paths():
    d = Diagram("Two UI adaptation paths", "They solve different problems and have different evidence; do not present them as the same healer", 3, "CURRENT")
    d.card(70, 190, 700, 136, "Deterministic selector healing", ["Default CheckoutUiStrategy; no model call"], CYAN)
    d.card(830, 190, 690, 136, "Cypress cy.prompt", ["Opt-in CheckoutUiStrategy; Cloud-backed AI"], VIOLET)
    d.card(70, 366, 700, 180, "What changes", ["MUTATE_DOM renames a data-testid", "LocatorProxy tries the original selector", "A11y fallback requires one unique match"], CYAN)
    d.card(830, 366, 690, 180, "How it runs", ["Natural-language steps in checkout.prompt.md", "Country-specific target + runtime values", "Two cy.prompt calls per scenario"], VIOLET)
    d.card(70, 590, 700, 157, "Demonstrated", ["Five-market mutation demo and fallback pass", "Selected fallback is logged in the run"], GREEN)
    d.card(830, 590, 690, 157, "Demonstrated", ["Five markets passed in recorded Cloud run 8", "Healing of this specific DOM mutation is untested"], ORANGE)
    d.arrow([(420, 326), (420, 366)], CYAN)
    d.arrow([(1175, 326), (1175, 366)], VIOLET)
    d.arrow([(420, 546), (420, 590)], CYAN)
    d.arrow([(1175, 546), (1175, 590)], VIOLET)
    d.save("03-healing-paths.svg")


def pipelines():
    d = Diagram("CI communication map", "Three distinct paths: automatic verification, manual AI Checkout, and failure-only triage", 4, "CURRENT")
    d.card(70, 182, 340, 155, "Push / PR", ["Typecheck", "Auth + Catalog + Checkout", "No Cloud recording by default"], CYAN)
    d.card(508, 182, 440, 155, "Deterministic suite", ["Mochawesome + screenshots", "GitHub job summary", "Optional TestRail, if configured"], GREEN)
    d.card(1050, 182, 470, 155, "Success", ["Pipeline is green", "Triage job is skipped"], GREEN)
    d.arrow([(410, 259), (508, 259)])
    d.arrow([(948, 259), (1050, 259)], GREEN)
    d.card(508, 385, 440, 173, "Failure evidence", ["Failed job logs + screenshots", "Deterministic JSON verdict", "Optional Claude enrichment"], RED)
    d.card(1050, 385, 470, 173, "Current triage actions", ["Flake / cold start: capped rerun", "Other: PR comment or GitHub Issue", "No strict product-bug gate yet"], RED)
    d.arrow([(729, 337), (729, 385)], RED)
    d.arrow([(948, 471), (1050, 471)], RED)
    d.card(70, 622, 380, 145, "Manual dispatch", ["cy-prompt-suite.yml", "CYPRESS_RECORD_KEY secret"], VIOLET)
    d.card(535, 622, 440, 145, "Checkout via cy.prompt", ["Five country examples", "Recorded Chromium run"], VIOLET)
    d.card(1050, 622, 470, 145, "Cypress Cloud", ["Run results + Test Replay", "CLI needs separate auth"], VIOLET)
    d.arrow([(450, 696), (535, 696)], VIOLET)
    d.arrow([(975, 696), (1050, 696)], VIOLET)
    d.save("04-ci-and-triage.svg")


def proposed_loop():
    d = Diagram("Target agentic demo loop", "Planned connection for the talk; these boxes are not yet an implemented end-to-end pipeline", 5, "PROPOSED")
    steps = [
        (70, "Read case", ["TestRail get_case", "Validate ID + criteria"]),
        (370, "Map", ["Allowlisted @C tag", "One versioned scenario"]),
        (670, "Execute", ["Cypress + OmniPizza", "API / UI assertions"]),
        (970, "Collect", ["Result + screenshot", "Run URLs + retries"]),
        (1270, "Report", ["TestRail result", "Close the run"]),
    ]
    for i, (x, title, body) in enumerate(steps):
        d.card(x, 213, 260, 169, title, body, [ORANGE, CYAN, GREEN, VIOLET, ORANGE][i], size=19)
        d.circle(x + 232, 200, i + 1, [ORANGE, CYAN, GREEN, VIOLET, ORANGE][i])
        if i < len(steps) - 1:
            d.arrow([(x + 260, 298), (x + 300, 298)])
    d.card(160, 496, 400, 185, "Classify", ["Deterministic signals first", "Optional agent enrichment", "Evidence + confidence"], VIOLET)
    d.card(625, 496, 400, 185, "Policy gate", ["Reachable app + valid locator", "Failed business claim + repeat", "Deduplicate case/signature"], ORANGE)
    d.card(1090, 496, 350, 185, "Publish", ["Confirmed bug → Issue", "Other failure → diagnosis", "Link evidence"], GREEN)
    d.arrow([(1400, 382), (1400, 448), (360, 448), (360, 496)], ORANGE)
    d.arrow([(560, 589), (625, 589)])
    d.arrow([(1025, 589), (1090, 589)])
    d.text(90, 762, "Already built: @C mapping, Cypress execution, TestRail result writer, Cloud recording, CI triage.", 22, MUTED)
    d.text(90, 797, "To build: case preflight, a single-case orchestration job, strict issue gate, and controlled product regression.", 22, ORANGE)
    d.save("05-proposed-agentic-loop.svg")


if __name__ == "__main__":
    for render in (current_architecture, case_lifecycle, healing_paths, pipelines, proposed_loop):
        render()
    print(f"Wrote five SVG diagrams to {OUT}")
