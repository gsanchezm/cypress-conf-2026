# cypress-conf-2026

<p align="center">
  <strong>Arquitectura de Pruebas Atómicas para Cypress — API, Web y Agentes de IA</strong><br />
  Con <a href="https://gsanchezm.github.io/OmniPizza/">OmniPizza</a>: Una plataforma real desplegada de forma independiente con múltiples mercados.
</p>

<p align="center">
  <a href="README.md"><strong>English</strong></a> ·
  <a href="README_ES.md"><strong>Español</strong></a> ·
  <a href="README_DE.md"><strong>Deutsch</strong></a> ·
  <a href="README_ZH.md"><strong>简体中文</strong></a> ·
  <a href="README_HI.md"><strong>हिन्दी</strong></a>
</p>

---

## 🌟 Visión General

**cypress-conf-2026** demuestra una arquitectura de pruebas atómicas end-to-end basada en tres pilares:
1. **Escenarios Atómicos:** Hidratación de estado mediante API seguida de verificación enfocada en UI.
2. **Gobernanza de Agentes de IA:** Hooks mecánicos deterministas que impiden que los agentes alteren el oráculo o contrato de prueba.
3. **Observabilidad Empresarial:** Reportes optimizados hacia **TestRail** (HTTP masivo en bulk) y **Cypress Cloud CLI** con triage autónomo en CI.

### 🍕 Sistema Bajo Prueba (SUT): OmniPizza
Una plataforma completa de nivel productivo creada específicamente para testing:
- **Aplicación Web:** [omnipizza-frontend.onrender.com](https://omnipizza-frontend.onrender.com)
- **API (OpenAPI 3.1):** [omnipizza-backend.onrender.com/api/docs](https://omnipizza-backend.onrender.com/api/docs)
- **5 Mercados Regionales:** 🇺🇸 US (Código postal) · 🇲🇽 MX (Colonia) · 🇨🇭 CH (Código postal) · 🇯🇵 JP (Prefectura) · 🇸🇦 SA (Distrito, árabe RTL).
- **Endpoints de Setup:** Endpoints etiquetados como `(atomic test setup)` permiten sembrar sesiones de usuario y carritos vía HTTP en milisegundos.

---

## 📐 Arquitectura de Pruebas Atómicas

En lugar de flujos lentos e intermitentes a través de múltiples pantallas en la UI (Login ➔ Catálogo ➔ Carrito ➔ Checkout), cada prueba sigue el patrón **Template Method** a través de `AtomicScenario`:

```text
1. arrangeViaApi()  ➔ Peticiones HTTP reales para sembrar el estado y validar el contrato de API.
        ⬇
2. hydrateUi()      ➔ Inyectar el estado al navegador (sesión/localStorage) y ejecutar solo la acción bajo prueba.
        ⬇
3. assertUi()       ➔ Una sola comprobación sobre el DOM renderizado.
```

### Presupuesto de Aserciones: Máximo 2
- **1 Afirmación de API:** Valida la lógica de negocio y contrato (ej. HTTP 201 Created).
- **1 Afirmación de UI:** Valida el resultado renderizado (ej. el total formateado coincide byte a byte con la API).
- **Precondiciones y Guardias:** Las verificaciones de infraestructura (`precondition()`) y de estabilidad del DOM (`.should('be.visible')`) **no** consumen presupuesto y lanzan `PreconditionError` si no se cumplen.

---

## 🤖 Ecosistema Agéntico y Hooks de Seguridad

El repositorio está diseñado para ser operado con seguridad por agentes autónomos (Claude Code, Codex, Copilot, DeepSeek) sin relajar el oráculo de pruebas:

| Componente | Rol | Mecanismo |
|---|---|---|
| **`AGENTS.md`** | Constitución del Repositorio | Estilo estricto, regla pnpm-only y acciones prohibidas. |
| **`guard-oracle.ts`** | Protección del Oráculo | Bloquea ediciones a archivos `.feature` y métodos `assert*` (Exit 2). |
| **`guard-bash.ts`** | Control de Comandos | Deniega ejecuciones no autorizadas de `--record`, `cyPrompt` y `git push`. |
| **`cypress-tap`** | Feedback en Vivo del Agente | El subagente `cy-fixer` inspecciona snapshots del DOM real vía `cypress open`. |
| **`cypress-cloud-cli`** | Inspección Cloud | El subagente `cy-triage` analiza corridas y líneas de tiempo vía `cy-cloud`. |
| **Graphify** | Grafo de Contexto Local | Mapea más de 630 símbolos y dependencias en un grafo consultable sin costo de API de LLM. |

---

## 🛡️ Tres Niveles de Sanación ("Ring Check")

Cuando un cambio en la aplicación altera el DOM (demostrado con `MUTATE_DOM=checkout.address` que renombra `data-testid`), el framework ofrece tres niveles de recuperación:

1. **Fallbacks por Accesibilidad (`HEAL_LOCATORS=a11y`):** Instantáneo, costo $0, sin LLM. Se recupera mediante niveles cosechados (`id` ➔ `name` ➔ `aria-label` ➔ `placeholder`). Funciona incluso en árabe RTL.
2. **Reparación por Agente de IA (`cy-fixer`):** Inspecciona el DOM con fallo vía `cypress tap` y repara de forma autónoma `locators/*.json` en un máximo de 5 iteraciones.
3. **Pruebas Semánticas con IA (`UI_STRATEGY=cyPrompt`):** Evalúa pasos escritos en Markdown legible (`checkout.prompt.md`) directamente contra la semántica de la UI renderizada, sin depender del registro de selectores.

---

## 📊 Observabilidad Empresarial

### Integración en Bulk con TestRail
- `TestRailObserver` personalizado conectado al evento `after:run` de Cypress.
- Reporta corridas completas en solo **tres peticiones HTTP en bulk** (respetando el límite de 180 req/min de Cloud).
- Caídas o fallos en TestRail nunca alteran el código de salida de pruebas que pasaron exitosamente.

### Cypress Cloud CLI y CI Autónomo
- **Inspección Local:** Consulta corridas, líneas de tiempo y capturas de fallos vía `pnpm cloud:runs` y `cy-cloud`.
- **CI Autónomo (`ci-triage.yml`):** Analiza automáticamente fallos en CI. Si la confianza en un `flake` o `cold_start` supera 0.7, despacha un reintento sin intervención humana.

---

## 🚀 Inicio Rápido y Comandos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Despertar servicios backend (Render free-tier)
pnpm warmup

# 3. Validar tipos y ejecutar pruebas
pnpm typecheck
pnpm cy:run --browser chrome --spec cypress/e2e/checkout/checkout.feature

# 4. Demo de auto-sanación en vivo (A11y fallbacks)
pnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature \
  --expose MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y --config retries=0

# 5. Consultar estado en Cypress Cloud CLI
pnpm cloud:status
pnpm cloud:runs
```

---

## 📄 Licencia
ISC © [Gilberto Sánchez (Mexitester)](https://linkedin.com/in/gilberto-sanchez-mares)
