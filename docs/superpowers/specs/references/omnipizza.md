# OmniPizza — System Under Test Survey

Reference material gathered 2026-08-19 while designing `cypress-conf-2026`. Re-verify against
`/api/docs` before relying on this for implementation — Render free-tier deploys can drift.

## URLs

- GitHub Pages (project overview): https://gsanchezm.github.io/OmniPizza/
- Frontend (UI under test): https://omnipizza-frontend.onrender.com
- Backend (API under test): https://omnipizza-backend.onrender.com
- Swagger UI: https://omnipizza-backend.onrender.com/api/docs
- OpenAPI spec: https://omnipizza-backend.onrender.com/api/openapi.json

## Tech stack (per project overview page)

- Frontend: React + Vite, Zustand state management, Vitest
- Backend: FastAPI (Python)
- Mobile (out of scope for this framework): Expo React Native
- Deployment: Render

## Deterministic test users

Password `pizza123` for all.

| Username | Behavior |
|---|---|
| `standard_user` | Normal flow |
| `locked_out_user` | Locked-out error response |
| `problem_user` | Broken UI scenario |
| `performance_glitch_user` | 3-second delay |
| `error_user` | Random 500 errors |
| `a11y_glitch_user` | Random accessibility failures |
| `security_glitch_user` | Poisoned profile, IDOR, leaked checkout errors |

## Markets

Six markets referenced in the project overview (Mexico, US, Switzerland, Japan, Saudi Arabia — one
more not yet identified); market selection at login drives pricing, tax, required checkout fields,
and localization for the rest of the session (no mid-session cart clearing).

Country codes seen in the API: `MX`, `US`, `CH`, `JP`, `SA`.

Checkout required fields per country:

| Country | Required field | Notes |
|---|---|---|
| MX | `colonia` | neighborhood |
| US | `zip_code` | 5 digits |
| CH | `plz` | postal code |
| JP | `prefectura` | prefecture |
| SA | `district` | |

Tip field is named differently per market: `propina`, `tip`, `trinkgeld`, `chip`, `baksheesh`
(0–100 percentage range).

## API endpoints (from `/api/openapi.json`)

| Path | Method | Tag | Summary |
|---|---|---|---|
| `/api/auth/login` | POST | Authentication | Authenticate with test credentials |
| `/api/auth/users` | GET | Authentication | List available test users |
| `/api/auth/profile` | GET | Authentication | Retrieve current user profile |
| `/api/users/me/profile` | GET/PATCH | User Profile | Get/update editable profile |
| `/api/pizzas` | GET | Pizzas | Catalog with country pricing (`X-Country-Code` header required, `X-Language` optional) |
| `/api/countries` | GET | Countries | List supported regions & configs |
| `/api/cart` | GET/POST | Cart | Retrieve or seed shopping cart |
| `/api/cart/items/{item_id}` | PUT/DELETE | Cart | Upsert or remove line items |
| `/api/store/market` | POST | Store | Set active market per session |
| `/api/checkout` | POST | Orders | Process payment & create order |
| `/api/orders` | GET | Orders | Order history |
| `/api/orders/{order_id}` | GET/PATCH | Orders | View or cancel (pending→cancelled only, 409 otherwise); 403 if not owner |
| `/api/session` | GET | Session | Check session state |
| `/api/session/reset` | POST | Session | Clear session & profile |

**Login**: `username` (3–50 chars), `password` (6–100 chars) → `access_token`, `token_type: "bearer"`,
`username`, behavior label.

**Profile**: editable fields — `full_name`, `phone`, `address`, `notes`, `birthday`, `premium`.

**Pizzas**: each item — `id`, `name`, `description`, `price`, `base_price`, `currency`,
`currency_symbol`, `image`, `category`.

**Checkout response (`OrderSummary`)**: `order_id`, `status`, `subtotal`, `delivery_fee`, `tax`,
`tip`, `total`, `currency`, `items[]`, `timestamp`.

## Architecture note (from project overview)

Frontend is feature-organized (auth, catalog, checkout, country, profile, orderSuccess) with
repository/use-case/UI layers — i.e., OmniPizza's own frontend already uses a layering broadly
compatible with this framework's vertical-slice approach.

## Not yet verified (confirm during implementation)

- Exact 6th market beyond MX/US/CH/JP/SA.
- Whether `cy.prompt()` can reliably navigate the SPA's client-side routing without extra hints —
  worth an early spike once `AiPromptStrategy` implementation starts.
- Actual DOM structure/`data-testid` values — the frontend is a client-rendered SPA, so this needs a
  real browser session (Cypress `cypress open`), not `WebFetch`, to inspect.
