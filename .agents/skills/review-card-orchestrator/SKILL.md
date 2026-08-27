---
name: review-card-orchestrator
description: Coordinate English review-card changes across the local Codex skill, Python renderer, ChatGPT MCP server, widget, and their tests.
---

# Review Card Orchestrator

## When to Use

- Use for features, bug fixes, or contract changes that cross two or more of `english-review-card/`, `chatgpt-app/src/quiz.ts`, the MCP registration, and the widget.
- Use for releases where local and remote review-card behavior must remain aligned.
- Do not use for a narrow, isolated text or style edit with no cross-surface effect.

## Required Inputs

- The user request and acceptance criteria.
- The current working tree, including uncommitted user changes.
- Relevant source, schema, tests, and README files from both delivery surfaces.

## Workflow

1. **Scope and contract.** Identify affected surfaces and invariants. For delegated, dynamic, or resumable work, apply `.agents/skills/review-card-supervisor/SKILL.md`; otherwise write `_workspace/00_input/request-summary.md` only when a durable handoff is useful.
2. **Design.** Compare the JSON schema, Python validation/rendering, TypeScript validation, MCP metadata, and widget consumption as applicable. Record durable decisions in `_workspace/01_contract_plan.md` only when another phase or worker must consume them.
3. **Implement.** Keep one integration owner. Delegate only bounded, independent, read-heavy analysis or non-overlapping file sets. Preserve user changes and never edit generated `dist/` files directly.
4. **Verify boundaries.** Apply `.agents/skills/review-card-qa/SKILL.md`. Run the focused tests first, then both complete suites for cross-surface changes.
5. **Finish.** Update documentation when commands, deployment, user behavior, or the public quiz contract changes. If a durable audit is useful, write `_workspace/03_qa_report.md` and `_workspace/final/change-summary.md`.

## Outputs

- Requested source and test changes in their canonical directories.
- Optional deterministic handoffs defined in `docs/harness/review-card/team-spec.md`.
- A final summary naming changed behavior, verification performed, and unresolved risk.

## Delegation Rules

- Keep tightly coupled changes with one agent.
- Parallelize read-only inspection or tests only when resources do not conflict.
- Parallel writes require non-overlapping paths or isolated worktrees; one integration owner resolves conflicts and accepts the result.
- Maximum delegation depth is one. A failed worker returns evidence and uncertainty; synthesis must not imply missing coverage succeeded.
- When task state is persisted, mutate it only through `python3 scripts/manage_tasks.py`; do not hand-edit the index and task files.

## Failure Policy

- Retry a failed deterministic check once after diagnosing its cause, not blindly.
- If the two quiz contracts disagree, stop integration and make the mismatch explicit before continuing.
- If requested question volume cannot be grounded in conversation material, preserve the existing product rule: ask for more material rather than inventing content.
- Escalate permission, deployment, authentication, or destructive actions that exceed the user's authorization.

## Validation

- Run `python3 -m unittest discover -s english-review-card/tests -v`.
- Run `npm test` from `chatgpt-app/`; this includes the TypeScript build.
- For schema changes, test valid input plus malformed, under-minimum, duplicate-ID, and type-specific option cases as applicable.
- For widget changes, verify initial render, restored state, grading, settings, wrong-answer retry, and another-round follow-ups.
- Read `docs/harness/review-card/team-spec.md` for the full handoff and acceptance contract.
- Run `python3 -m unittest discover -s tests -v` after changing the task ledger or supervisor workflow.
