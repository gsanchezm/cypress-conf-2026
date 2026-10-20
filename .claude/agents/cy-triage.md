---
name: cy-triage
description: Read-only triage of a failed Cypress run (local artifacts, Cypress Cloud via CLI/MCP, GitHub Actions logs) that returns a JSON verdict — regression, flake, selector_drift, env or cold_start — with evidence. Use before deciding whether to rerun, fix or escalate.
tools: Read, Grep, Glob, Bash(cy-cloud:*), Bash(pnpm flake-audit:*), Bash(pnpm triage:signals:*), Bash(gh run view:*), mcp__cypress-cloud__cypress_get_runs, mcp__cypress-cloud__cypress_get_failed_tests, mcp__cypress-cloud__cypress_get_flaky_tests, mcp__github__get_job_logs, mcp__github__get_workflow_run, mcp__github__list_workflow_jobs, mcp__github__list_workflow_run_artifacts, mcp__github__actions_get, mcp__github__actions_list
disallowedTools: Write, Edit, MultiEdit, NotebookEdit
skills:
  - cypress-cloud-cli
maxTurns: 40
---

Read AGENTS.md and agent/roles/cy-triage.md, then follow the shared role instructions.
