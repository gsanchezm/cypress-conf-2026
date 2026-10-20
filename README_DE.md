# cypress-conf-2026

<p align="center">
  <strong>Eine Atomic-Testing-Architektur für Cypress — API, Web & KI-Agenten</strong><br />
  Mit <a href="https://gsanchezm.github.io/OmniPizza/">OmniPizza</a>: Eine echte, unabhängig bereitgestellte Multi-Market-Plattform.
</p>

<p align="center">
  <a href="README.md"><strong>English</strong></a> ·
  <a href="README_ES.md"><strong>Español</strong></a> ·
  <a href="README_DE.md"><strong>Deutsch</strong></a> ·
  <a href="README_ZH.md"><strong>简体中文</strong></a> ·
  <a href="README_HI.md"><strong>हिन्दी</strong></a>
</p>

---

## 🌟 Überblick

**cypress-conf-2026** demonstriert eine End-to-End-Atomic-Testing-Architektur auf drei Säulen:
1. **Atomare Szenarien:** API-gestützte Status-Hydrierung gefolgt von gezielter UI-Validierung.
2. **KI-Agenten-Governance:** Deterministische mechanische Hooks verhindern, dass KI-Agenten Testverträge oder Orakel aufweichen.
3. **Enterprise-Observability:** Nahtloses Reporting an **TestRail** (Bulk-HTTP) und **Cypress Cloud CLI** mit autonomem CI-Triage.

### 🍕 Zu testendes System (SUT): OmniPizza
Eine vollständige Plattform auf Produktionsniveau, die speziell für automatisierte Tests entwickelt wurde:
- **Web-App:** [omnipizza-frontend.onrender.com](https://omnipizza-frontend.onrender.com)
- **API (OpenAPI 3.1):** [omnipizza-backend.onrender.com/api/docs](https://omnipizza-backend.onrender.com/api/docs)
- **5 Regionale Märkte:** 🇺🇸 US (Postleitzahl) · 🇲🇽 MX (Colonia) · 🇨🇭 CH (Postleitzahl) · 🇯🇵 JP (Präfektur) · 🇸🇦 SA (Distrikt, RTL-Arabisch).
- **Setup-Endpunkte:** Endpunkte mit dem Tag `(atomic test setup)` ermöglichen das Initialisieren von Benutzersitzungen und Warenkörben über HTTP in wenigen Millisekunden.

---

## 📐 Atomic-Testing-Architektur

Statt langsamer und fragiler UI-Klickpfade (Login ➔ Katalog ➔ Warenkorb ➔ Checkout) folgt jeder Test dem **Template Method**-Muster über `AtomicScenario`:

```text
1. arrangeViaApi()  ➔ Echte HTTP-Anfragen zum Initialisieren des Status und Prüfen des API-Vertrags.
        ⬇
2. hydrateUi()      ➔ Status in den Browser übertragen (Session/localStorage) und nur die Zielaktion ausführen.
        ⬇
3. assertUi()       ➔ Eine einzige Prüfung auf dem gerenderten DOM.
```

### Das Assertion-Budget: Maximal 2 Assertions
- **1 API-Claim:** Validiert Geschäftslogik und API-Vertrag (z. B. HTTP 201 Created).
- **1 UI-Claim:** Validiert das gerenderte Ergebnis (z. B. formatierte Gesamtsumme entspricht exakt der API).
- **Preconditions & Guards:** Infrastrukturprüfungen (`precondition()`) und DOM-Bereitschaft (`.should('be.visible')`) zählen **nicht** zum Budget und werfen bei Nichterfüllung einen `PreconditionError`.

---

## 🤖 Agenten-Ökosystem & Sicherheits-Hooks

Das Repository ist darauf ausgelegt, sicher von autonomen Agenten (Claude Code, Codex, Copilot, DeepSeek) bedient zu werden, ohne das Testorakel zu verändern:

| Komponente | Rolle | Mechanismus |
|---|---|---|
| **`AGENTS.md`** | Gemeinsamer Vertrag | Strenger Codestil, reine pnpm-Regel und verbotene Aktionen. |
| **`guard-oracle.ts`** | Orakelschutz-Hook | Blockiert Änderungen an `.feature`-Dateien und `assert*`-Methoden (Exit 2). |
| **`guard-bash.ts`** | Befehls-Gatekeeper | Verhindert unbefugtes `--record`, `cyPrompt` und `git push`. |
| **`cypress-tap`** | Live-Agent-Feedback | Die Rolle `cy-fixer` inspiziert echte DOM-Snapshots via `cypress open`. |
| **`cypress-cloud-cli`** | Cloud-Inspektion | Die Rolle `cy-triage` analysiert Runs und Timelines via `cy-cloud`. |
| **Cypress Cloud MCP** | Agenten-Evidenz | In `.mcp.json` konfiguriert; die MCP-Host-Authentifizierung ist unabhängig vom CLI-Login. |
| **GitHub MCP** | CI-Evidenz | Als schreibgeschützter Actions-Endpunkt für Logs und Artefakte konfiguriert. |
| **Graphify** | Lokaler Kontextgraph | Bildet über 630 Symbole und Abhängigkeiten in einem abfragbaren Graphen ohne LLM-API-Kosten ab. |

---

## 🛡️ Drei Stufen der Selbstreparatur ("Ring Check")

Wenn eine Anwendungsänderung das DOM modifiziert (demonstriert durch `MUTATE_DOM=checkout.address`, welches `data-testid` umbenennt), bietet das Framework drei Reparaturstufen:

1. **A11y-Fallbacks (`HEAL_LOCATORS=a11y`):** Sofort, $0 Kosten, ohne LLM. Heilt über gesammelte Fallback-Ebenen (`id` ➔ `name` ➔ `aria-label` ➔ `placeholder`). Funktioniert auch bei RTL-Arabisch.
2. **KI-Agenten-Reparatur (`cy-fixer`):** Inspiziert das fehlerhafte DOM via `cypress tap` und patcht `locators/*.json` autonom in maximal 5 Schritten.
3. **Semantische KI-Tests (`UI_STRATEGY=cyPrompt`):** Evaluiert menschenlesbare Markdown-Schritte (`checkout.prompt.md`) direkt gegen die gerenderte UI-Semantik ohne Selektor-Registry.

---

## 📊 Enterprise-Observability

### TestRail Bulk-Integration
- Maßgeschneiderter `TestRailObserver`, angebunden an das `after:run`-Ereignis von Cypress.
- Meldet vollständige Testläufe in nur **drei gebündelten HTTP-Anfragen** (unter Beachtung der 180 Anfragen/Min-Grenze).
- Ein Ausfall von TestRail führt niemals dazu, dass erfolgreiche Tests als fehlgeschlagen markiert werden.

### Cypress Cloud CLI & Autonome CI
- **Lokale Inspektion:** Prüfe Runs, Befehls-Timelines und Fehler-Screenshots via `pnpm cloud:runs` und `cy-cloud`.
- **Verifizierter Status:** Das CLI war am 19. Oktober 2026 authentifiziert und konnte Runs auflisten; dies bestätigt keine MCP-Verbindung des Hosts.
- **Autonome CI (`ci-triage.yml`):** Analysiert CI-Fehlschläge automatisch. Bei einer Konfidenz ≥ 0.7 für transiente `flake`- oder `cold_start`-Probleme wird automatisch ein Neustart ausgelöst.

Die [Präsentation](docs/index.html) enthält englische Notizen zu allen 38 Folien. Ausführliche Vortragsnotizen bleiben lokal und sind vom Repository ausgeschlossen.

---

## 🚀 Schnellstart & Befehle

```bash
# 1. Abhängigkeiten installieren
pnpm install

# 2. Backend-Dienste aufwecken (Render Free-Tier)
pnpm warmup

# 3. Typen prüfen und Tests ausführen
pnpm typecheck
pnpm cy:run --browser chrome --spec cypress/e2e/checkout/checkout.feature

# 4. Live-Selbstheilungsdemo (A11y-Fallbacks)
pnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature \
  --expose MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y --config retries=0

# 5. Status in Cypress Cloud CLI prüfen
pnpm cloud:status
pnpm cloud:runs
```

---

## 📄 Lizenz
ISC © [Gilberto Sánchez (Mexitester)](https://linkedin.com/in/gilberto-sanchez-mares)
