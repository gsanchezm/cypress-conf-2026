# Cypress harness instructions

Follow the repository contract in `AGENTS.md` and the architecture in `README.md`. Preserve `.feature` cases and `assert*` claims during a repair; change steps, hydration strategies, or locators only. Use `pnpm` and verify the affected slice. `cy.prompt` and Cloud recording are optional demo paths. Claude-specific hooks do not run automatically in Copilot, so invoke the equivalent scripts in `scripts/hooks/` when checking a proposed edit or command.
