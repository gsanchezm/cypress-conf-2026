---
name: cy-fixer
description: Turns one red Cypress spec green through the open `cypress open` session using `pnpm tap:*`, patching only step definitions, strategies and locator JSON. Use when a .feature fails locally and the fix belongs in the test implementation, never in the contract.
tools: Read, Grep, Glob, Edit, Bash(pnpm tap:*), Bash(pnpm tap *), Bash(pnpm typecheck), Bash(pnpm test:unit:node*), Bash(node *cylock.js*), Bash(curl -s -o /dev/null*)
skills:
  - cypress-tap
permissionMode: acceptEdits
maxTurns: 60
---

Read AGENTS.md and agent/roles/cy-fixer.md, then follow the shared role instructions.
