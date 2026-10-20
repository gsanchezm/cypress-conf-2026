# TestRail cases in BDD format

The four files in [`bdd/`](bdd/) are generated from the three versioned Cypress
features. Auth keeps two cases (C1 and C2). Catalog C3 and Checkout C8 each
contain one `Scenario Outline` with five market rows in `Examples`. The source
files in `cypress/e2e/` remain the contract.

Regenerate after an approved contract change:

```powershell
pnpm testrail:bdd:prepare
pnpm testrail:bdd:prepare --check
```

To update the **existing** TestRail cases, install
[TestRail CLI](https://support.testrail.com/hc/en-us/articles/45582376878100-Behaviour-Driven-Development-BDD-commands-reference)
and make `trcli` available on `PATH` (or set `TESTRAIL_TRCLI` to its executable).
The publisher reads `TESTRAIL_URL`, `TESTRAIL_PROJECT_ID`, `TESTRAIL_USER`, and
`TESTRAIL_API_KEY` from the local ignored `.env` file and passes credentials to
the CLI through environment variables. Do not place the API key in command
arguments or tracked files.

Then, from the repository root:

```powershell
pnpm testrail:bdd:prepare --check
pnpm testrail:bdd:publish
pnpm testrail:bdd:verify
```

The publisher uses `--case-id` and `--update` to preserve C1, C2, C3, and C8, then selects
the BDD case template. The verifier reads the remote cases and checks their
template, scenario, steps, and example values against these files.
The `TestRailObserver` groups the five Cypress market results into one TestRail
result per outline case, with a per-market status and comment. The retired
cases C4–C7 and C9–C12 are preserved in the **Legacy market cases (before BDD
parameterization)** section, so historical runs keep their links. To verify or
repeat that reversible move, run `pnpm testrail:bdd:archive`.

The completed [R10](https://cypressconference2026.testrail.io/index.php?/runs/view/10)
contains twelve passing Cypress scenarios grouped into four case results. Check
it with `pnpm testrail:bdd:verify --run 10`.

TestRail documents [updating an existing BDD case with `import_gherkin --update`](https://support.testrail.com/hc/en-us/articles/45582376878100-Behaviour-Driven-Development-BDD-commands-reference)
and [BDD case templates](https://support.testrail.com/hc/en-us/articles/7827238336916-Behavior-Driven-Development-BDD).
