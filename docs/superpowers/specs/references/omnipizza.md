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

**Resolved 2026-08-19**: exactly **5 markets**, confirmed via a live `GET /api/countries` call —
`MX`, `US`, `CH`, `JP`, `SA`. The project overview page's "six markets" phrasing is marketing copy
that doesn't match the live API; treat 5 as authoritative (the spec's §2/§3 already say 5). Market
selection at login drives pricing, tax, required checkout fields, and localization for the rest of
the session (no mid-session cart clearing).

Checkout required fields per country (verified live via `GET /api/countries`, 2026-08-19):

| Country | Currency | Required field | Tip field | Tax rate | Delivery fee |
|---|---|---|---|---|---|
| MX | MXN | `colonia` | `propina` | 16% | 35.10 |
| US | USD | `zip_code` | `tip` | 8% | 2.00 |
| CH | CHF | `plz` | `trinkgeld` | 8.1% | 1.56 |
| JP | JPY | `prefectura` | `chip` | 10% | 316.00 (0 decimal places) |
| SA | SAR | `district` | `baksheesh` | 15% | 7.50 |

All 5 markets expose `tip_percentages: [0, 5, 10, 15]` and `tip_mode: "percentage"`.

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

**Exact request/response schemas (verified against the live `/api/openapi.json`, 2026-08-19 — this
supersedes the earlier field lists in this doc, which were transcribed from a summarized fetch and
missed/mis-stated several fields):**

`CartItem` (request shape, e.g. body of `POST /api/cart`, embedded in `CheckoutRequest.items`):
required `pizza_id` (string), `quantity` (integer, 1–10). Optional: `size` (string, defaults to
`"small"`), `toppings` (string array), `item_id` (string, nullable). **Do not require `item_id`,
`size`, or `toppings`** — only `pizza_id`/`quantity` are mandatory.

`EnrichedCartItem` (response shape, inside `GET /api/cart`'s `cart_items[]`) — this is a *different,
fully-populated* schema from `CartItem`, not the same type reused: `pizza_id`, `item_id`, `name`,
`size`, `quantity`, `price`, `base_price`, `currency`, `currency_symbol`, `image` — all required.

`CheckoutRequest` (body of `POST /api/checkout`): required `country_code`, `items` (`CartItem[]`),
`name` (2–100 chars), `address` (5–200 chars), `phone` (8–20 chars). Optional: `payment_method`
(`"card"|"cash"|"paypal"`, default `"card"`), plus **all five** per-country required/tip fields as
nullable optional properties on the same schema (`colonia`, `zip_code`, `plz`, `prefectura`,
`district`, `propina`, `tip`, `trinkgeld`, `chip`, `baksheesh`, each 0–100 for the tip ones) — the
API accepts one request shape for every country rather than a discriminated union; only the field
matching the caller's country is expected to be populated.

`OrderSummary` (response of `POST /api/checkout`, `GET /api/orders/{id}`): required `order_id`,
`status`, `subtotal`, `delivery_fee`, **`tax_rate`**, **`tip_percentage`**, `tax`, `tip`, `total`,
`currency`, **`currency_symbol`**, `items[]` (untyped objects in the schema), `timestamp`. The three
bolded fields were missing from this doc's earlier summary — `tax_rate`/`tip_percentage` are
required, not derived client-side.

`OrderStatusUpdate` (body of `PATCH /api/orders/{id}`): `{ status: "cancelled" }` — a const, the only
supported transition, matching the "409 otherwise" behavior already noted above.

`TestCartSetupRequest` (actual body schema of `POST /api/cart`): `{ items: CartItem[] }`
(`minItems: 1`), **replaces the entire cart** rather than appending. Its OpenAPI description
resolves the cart/market quirk noted below.

## Architecture note (from project overview)

Frontend is feature-organized (auth, catalog, checkout, country, profile, orderSuccess) with
repository/use-case/UI layers — i.e., OmniPizza's own frontend already uses a layering broadly
compatible with this framework's vertical-slice approach.

## Verified via live API probe (2026-08-19)

Logged in twice as `standard_user` (curl, via `POST /api/auth/login`) to check whether cart/session
state is shared by username or isolated by session:

- Each login returns a JWT with a distinct `sid` claim (session id), even for the same username.
- `GET /api/cart` under each token returned different `updated_at` timestamps — the two sessions are
  backed by distinct state objects, not a shared per-username record.
- A cart item added under one token's session was not visible when reading the cart with the other
  token — **no cross-session leakage observed**.
- **Implication for CI**: a parallel test matrix can safely reuse the same deterministic username
  (e.g. `standard_user`) across concurrent jobs — each job's own login produces an isolated session.
- **Cart/market quirk — resolved 2026-08-19**, via the live OpenAPI's `TestCartSetupRequest`
  description: *"Cart is scoped to the login session, not the market — this request body has no
  `country_code` field and `X-Country-Code` is ignored by `POST /api/cart`. Use `POST
  /api/store/market` to switch markets."* This is exactly what the earlier probe hit: the item was
  written under whatever market the session already had active (apparently defaulting to MX), and
  the `X-Country-Code: US` header on the follow-up `GET` had no effect on which market's cart was
  read. **Implication for the Checkout slice**: any test that seeds a cart and then checks out under
  a specific country must call `POST /api/store/market` first — sending `X-Country-Code` alone is
  not sufficient.

## Not yet verified (confirm during implementation)

- Whether `cy.prompt()` can reliably navigate the SPA's client-side routing without extra hints —
  worth an early spike once `CyPromptCheckoutUiStrategy` implementation starts.
- Actual DOM structure/`data-testid` values, and the real `localStorage` key used for the auth token
  — the frontend is a client-rendered SPA, so this needs a real browser session, not `WebFetch`, to
  inspect. Confirmed 2026-08-19 that `claude-in-chrome` browser automation works in this environment
  (navigated to the live frontend successfully) — that's the harvest mechanism used, not
  `cypress open` (unreliable in a sandboxed background session with no confirmed attached display).
