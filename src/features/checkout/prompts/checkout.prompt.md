# Checkout prompts

The natural-language steps `CyPromptCheckoutUiStrategy` hands to Cypress's `cy.prompt()`.
This file is the prompt text itself, not documentation about it — editing a line here changes
what the AI is asked to do on the next run.

**How it is read.** A `##` heading opens a section, and every `-` list item under it becomes one
`cy.prompt()` step, in the order written. Prose like this paragraph is ignored, so rationale can live
next to the steps it explains. `{placeholders}` are substituted by `cy.prompt()` from values passed in
TypeScript; `preparePrompt()` fails the test if a token here has no matching value, or a value has no
matching token, so a rename on either side is a loud error rather than a literal `{addres}` reaching
the model.

**One `cy.prompt()` call per section, never per click.** The batching is deliberate: it preserves the
multi-step form `cy.prompt`'s own design is built around, and it fixes each scenario's cost at exactly
two calls no matter how many fields the form grows. See §8 of
`docs/superpowers/specs/2026-08-19-cypress-conf-2026-framework-design.md` for the free-tier
prompt-budget rationale (100/hour; 5 scenarios × 2 calls = 10 calls per run).

## completeCheckout

Unlike `DeterministicCheckoutUiStrategy`, this path does **not** seed the cart via the API. Driving
"add to cart" through natural language is the point of the strategy — exercising the AI-resolved UI
end to end is what it exists to prove.

The delivery-detail step is the strongest argument in the whole suite for `cy.prompt`: one sentence
covers what the deterministic path needs a five-entry `CheckoutCountryStrategy` map plus five locator
keys to express.

- Add the pizza with id {pizzaId} to the cart from the catalog page
- Confirm adding it to the cart
- Go to the checkout page
- Enter {address} into the address field
- Enter {requiredFieldValue} into this country's required delivery-detail field (zip code, neighborhood, postal code, prefecture, or district, whichever this country uses)
- Enter {name} into the full name field
- Enter {phone} into the phone field
- Select cash as the payment method
- Click the place order button
- Confirm the order

## assertOrderConfirmation

One claim, matching the deterministic strategy's budget: the rendered total must equal the total the
API computed for this market. The confirmation-page step above it is a guard — it gives the AI the
context that the page has to be showing before the total means anything.

`{expectedTotalText}` arrives already formatted per market (fullwidth yen for JP, RTL marks and
Arabic-Indic digits for SA, and so on) — the model is asked to match text, never to format currency.

- Verify the order confirmation page is showing
- Verify the order total shown is exactly {expectedTotalText}
