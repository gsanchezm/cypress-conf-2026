# Checkout prompts

The natural-language steps `CyPromptCheckoutUiStrategy` hands to Cypress's `cy.prompt()`.
This file is the prompt text itself, not documentation about it — editing a line here changes
what the AI is asked to do on the next run.

**How it is read.** A `##` heading opens a section, and every `-` list item under it becomes one
`cy.prompt()` step, in the order written. Prose like this paragraph is ignored, so rationale can live
next to the steps it explains. `{{placeholders}}` are substituted by `cy.prompt()` from values passed in
TypeScript; `preparePrompt()` fails the test if a token here has no matching value, or a value has no
matching token, so a rename on either side is a loud error rather than a literal `{{addres}}` reaching
the model.

**One `cy.prompt()` call per section, never per click.** The batching is deliberate: it preserves the
multi-step form `cy.prompt`'s own design is built around, and it fixes each scenario's cost at exactly
two calls no matter how many fields the form grows. Each call is one billed execution (Cypress Cloud,
since 2026-08-01): 5 scenarios × 2 calls = 10 executions per run against the Starter plan's 100 per
month — `src/core/prompts/checkoutBudget.node.test.ts` asserts that number from this file. A section
may not exceed 50 steps; `parsePromptDocument` throws above that.

## completeCheckout

Unlike `DeterministicCheckoutUiStrategy`, this path does **not** seed the cart via the API. Driving
"add to cart" through natural language is the point of the strategy — exercising the AI-resolved UI
end to end is what it exists to prove.

The country-specific delivery-detail step is inserted at the marker below. Cypress does not allow
placeholders in element targets, so each country names its field explicitly. The value remains a
placeholder to preserve the `cy.prompt` cache and keep runtime values out of AI requests.

- Add the Margherita pizza to the cart from the catalog page
- Confirm adding it to the cart
- Go to the checkout page
- Enter {{address}} into the address field
- [requiredField]
- Enter {{name}} into the full name field
- Enter {{phone}} into the phone field
- Click the cash payment option
- Click the place order button
- Confirm the order

## requiredFieldUS

- Enter {{requiredFieldValue}} into the zip code field

## requiredFieldMX

- Enter {{requiredFieldValue}} into the colonia (neighborhood) field

## requiredFieldCH

- Enter {{requiredFieldValue}} into the postal code (PLZ) field

## requiredFieldJP

- Enter {{requiredFieldValue}} into the prefecture field

## requiredFieldSA

- Enter {{requiredFieldValue}} into the district field

## assertOrderConfirmation

One claim, matching the deterministic strategy's budget: the rendered total must equal the total the
API computed for this market. The confirmation-page step above it is a guard — it gives the AI the
context that the page has to be showing before the total means anything.

`{{expectedTotalText}}` arrives already formatted per market (fullwidth yen for JP, RTL marks and
Arabic-Indic digits for SA, and so on) — the model is asked to match text, never to format currency.

- Verify the order confirmation page is showing
- Verify the order total shown is exactly {{expectedTotalText}}
