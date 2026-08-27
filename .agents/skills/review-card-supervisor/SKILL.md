---
name: review-card-supervisor
description: Dispatch, resume, and reconcile multi-step review-card work whose assignments and status must persist across agents or sessions.
---

# Review Card Supervisor

## When to Use

- Use when work has multiple independently assignable tasks, a changing backlog, or must resume across sessions.
- Use when the user asks to distribute work, track progress, recover blocked work, or inspect task ownership.
- Do not create a ledger for a small, tightly coupled change that one agent can finish directly.

## Required Inputs

- The overall goal and final acceptance criteria.
- A decomposition into tasks with explicit owned paths, dependencies, and expected artifacts.
- Available workers or role names; an assignee is an identifier, not proof that a runtime worker exists.

## Workflow

1. Read `references/task-state.md` before creating or changing task state.
2. Initialize the ledger with `python3 scripts/manage_tasks.py init` when `_workspace/tasks/index.json` is absent.
3. Create tasks small enough to own and verify, but large enough to avoid coordination churn. Declare dependencies and non-overlapping `--owned-path` values.
4. Use `claim --assignee ROLE` to atomically select the next ready task, or `assign TASK ROLE` when routing requires a named specialist.
5. Move claimed work through `in_progress` and `review`. Record blocking reasons and output artifacts in transitions.
6. Apply `.agents/skills/review-card-qa/SKILL.md` at the review edge. Only the integration owner moves a reviewed task to `completed`.
7. Before final synthesis, run `list`, verify every required task is completed, and disclose blocked, cancelled, or missing work.

## Outputs

- `_workspace/tasks/index.json` as the compact queue and recovery entry point.
- `_workspace/tasks/task-NNNN.json` as the authoritative history for each task.
- Source or review artifacts named by each task; the ledger references artifacts but does not replace them.

## Dispatch Rules

- A task is ready only when all dependencies are completed.
- `claim` skips tasks whose owned paths overlap active tasks because concurrent writes in one checkout are unsafe.
- Keep one integration owner as the synthesis and acceptance owner.
- Maximum delegation depth is one. A worker may return a result or blocker but does not silently redistribute its task.
- Task assignment through the ledger does not spawn a worker. The active runtime must perform delegation separately and use the same assignee identifier.

## Failure Policy

- Use `blocked` with a concrete reason when required input, permission, or a dependency outside the ledger prevents progress.
- Return a fixable review to `in_progress`; do not create a duplicate task merely to retry it.
- Use `cancelled` only when the task is intentionally removed from scope. Completed and cancelled tasks are terminal.
- Do not hand-edit task JSON. If the manager rejects a transition, fix the invalid state or dependency instead of bypassing it.

## Validation

- Run `python3 -m unittest discover -s tests -v` after changing the task manager or schema.
- Run `python3 scripts/manage_tasks.py list --json` to verify the ledger can be fully read.
- Confirm every active task has an assignee and every blocked task has a reason.
- Confirm final synthesis does not claim coverage from incomplete tasks.

## Reference

- Read [references/task-state.md](references/task-state.md) for the JSON contract, state transitions, and command examples.
