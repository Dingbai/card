# English Review Card Harness

## Goal

Keep the local Codex review-card skill and the remote ChatGPT MCP app behaviorally aligned while allowing either surface to remain independently deployable and testable.

## Architecture

The harness uses a **Supervisor** for persistent task dispatch. Each individual change follows a sequential **Pipeline** with a **Producer-Reviewer** quality gate:

1. scope the change and identify shared invariants;
2. design and implement through one integration owner;
3. review both sides of each affected boundary;
4. run surface-specific and cross-surface verification;
5. summarize the accepted result and remaining uncertainty.

The supervisor is activated only for a changing backlog, delegated work, or cross-session recovery. Most small changes remain in one context. Bounded workers are optional for independent read-heavy inspection, test runs, or non-overlapping implementation slices.

## Roles

| Role | Responsibility | Reusable guidance | Writes |
| --- | --- | --- | --- |
| Integration owner | Own scope, plan, implementation, synthesis, and final acceptance | `.agents/skills/review-card-orchestrator/SKILL.md` | Canonical source/tests; optional summary artifacts |
| Supervisor | Own persistent queue, routing, dependencies, and recovery | `.agents/skills/review-card-supervisor/SKILL.md` | `_workspace/tasks/` through `scripts/manage_tasks.py` |
| Contract specialist | Compare grounding rules and quiz schemas across Python and TypeScript | Existing `english-review-card/SKILL.md` plus this spec | `_workspace/01_contract_plan.md` when durable |
| App specialist | Check MCP registration, routes, widget state, and follow-up behavior | Orchestrator workflow | `chatgpt-app/` only when separately delegated |
| QA reviewer | Cross-check producer and consumer, then classify the result | `.agents/skills/review-card-qa/SKILL.md` | `_workspace/03_qa_report.md` when durable |

## Canonical Boundaries

| Producer | Consumer | Invariant |
| --- | --- | --- |
| Conversation-grounded quiz generation | Both delivery surfaces | Do not invent study material; default to five questions and honor explicit settings |
| `question-schema.md` and Python validation | Local HTML renderer | Accepted input, escaping, grading, and follow-up payloads remain coherent |
| `chatgpt-app/src/quiz.ts` | MCP tool and widget | Structured content exactly matches what the widget reads |
| MCP resource metadata | ChatGPT host | Resource URI, CSP, domain, output template, and widget HTML remain compatible |
| Widget settings/state | Follow-up request | Question count, selected types, and missed knowledge points survive round transitions |

## Phase Outputs and Handoffs

Durable handoffs are optional for small changes and required when work is delegated, resumable, or audit-sensitive.

| Phase | File | Required contents |
| --- | --- | --- |
| Input | `_workspace/00_input/request-summary.md` | User outcome, constraints, affected surfaces, acceptance criteria |
| Contract | `_workspace/01_contract_plan.md` | Field/rule changes, producer-consumer map, owned paths, test impact |
| Implementation | `_workspace/02_implementation_status.md` | Completed changes, deviations, known gaps |
| Review | `_workspace/03_qa_report.md` | `pass`/`fix`/`redo`, evidence, skipped checks, remaining risk |
| Final | `_workspace/final/change-summary.md` | Accepted behavior, commands/results, unresolved issues |

## Persistent Task Ledger

- `_workspace/tasks/index.json` is the compact queue and recovery entry point.
- `_workspace/tasks/task-NNNN.json` stores authoritative task state and history.
- `scripts/manage_tasks.py` is the only supported writer; it uses an exclusive lock and atomic file replacement.
- The state model and CLI contract are defined in `.agents/skills/review-card-supervisor/references/task-state.md`.
- A ledger assignment records intent but does not create a runtime worker. The supervisor must separately dispatch the work and keep the assignee identifiers aligned.

## Ownership and Delegation

- The integration owner is always the synthesis and acceptance owner.
- The supervisor claims only tasks whose dependencies are completed and whose owned paths do not overlap active tasks.
- Independent read-only reviews may run in parallel from the same repository snapshot.
- Writers in the same checkout must own disjoint top-level surfaces (`english-review-card/` or `chatgpt-app/`); any shared documentation, root config, schema decision, or generated state stays with the integration owner.
- Stateful test runs are serialized unless their ports, output directories, and generated files are isolated.
- Delegation depth is at most one. Runtime concurrency follows available capacity and genuinely independent work; it is not pinned in this repository.

## Failure Policy

- A missing input produces an explicit gap; it is not filled with invented behavior.
- A partial worker failure may be skipped only when its surface is outside acceptance criteria. Otherwise retry serially or report the task incomplete.
- Conflicting contract findings are resolved by comparing actual producer output with every consumer and the user-visible product rule. One side is not declared canonical merely because its tests pass alone.
- QA returns `fix` for localized defects and `redo` when the implementation violates grounding, independence of surfaces, or the requested direction.
- Revision is bounded to two review loops before escalating the unresolved issue to the user.

## Validation Matrix

| Change area | Minimum verification |
| --- | --- |
| Local schema/renderer | Python suite plus a rendered-fragment inspection |
| TypeScript quiz schema | TypeScript build and quiz tests |
| MCP routes/metadata | App tests plus `/health` and applicable MCP request behavior |
| Widget behavior | Widget tests covering render/state/action behavior |
| Shared quiz contract | Both complete suites and direct field/rule comparison |
| Deployment/config | Build, route/config inspection, and README sync |
| Task dispatch/state | `python3 -m unittest discover -s tests -v` plus `python3 scripts/manage_tasks.py list --json` |

## Test Scenarios

### Normal flow

- Request: add a quiz capability used by both surfaces.
- Expected: contract impact is named, both implementations and tests change coherently, both suites pass, and QA reports `pass` with evidence.

### Failure flow

- Failure: TypeScript accepts a field or limit that Python rejects, or the widget expects a field the MCP tool does not return.
- Expected: QA reports `fix`, identifies both files at the boundary, and integration does not complete until the mismatch is resolved or disclosed.

### Near miss

- Request: change wording in only the browser landing page with no contract or behavior effect.
- Expected: direct single-agent edit; no handoff artifacts and no specialist delegation.

## Removable Runtime Adapter

Codex subagents may be used when the runtime supports them and the delegation gate above is satisfied. This mapping is optional: deleting it must not change the portable phase, artifact, ownership, or failure contracts in this document.
