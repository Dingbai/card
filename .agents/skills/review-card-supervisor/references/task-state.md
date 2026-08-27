# Task State Contract

## Storage

`_workspace/tasks/index.json` is the recovery entry point. Each `task-NNNN.json` is the authoritative task record. The manager writes both under an exclusive lock and replaces files atomically.

Do not hand-edit these files. Use `python3 scripts/manage_tasks.py --help`.

## States

```text
pending -> assigned -> in_progress -> review -> completed
   |           |             |          |
   +-----------+-------------+----------+-> cancelled
               |             |          |
               +-------------+----------+-> blocked

blocked -> pending | assigned | cancelled
review  -> in_progress
assigned -> pending
```

- `pending`: unowned and eligible once dependencies complete.
- `assigned`: reserved for an assignee.
- `in_progress`: implementation or investigation is active.
- `review`: producer output is ready for the integration owner or QA reviewer.
- `completed`: accepted terminal result.
- `blocked`: paused with a required `blocked_reason`.
- `cancelled`: intentionally removed terminal result.

Entering `in_progress` requires all dependencies to be completed. Entering an active state requires an assignee. `claim` also rejects owned-path overlap with other active tasks.

## Task Record

```json
{
  "schema_version": 1,
  "id": "task-0001",
  "title": "Align quiz schema",
  "description": "Update and verify both schema consumers.",
  "status": "in_progress",
  "assignee": "contract-specialist",
  "depends_on": [],
  "owned_paths": ["english-review-card/references", "chatgpt-app/src/quiz.ts"],
  "artifacts": ["_workspace/01_contract_plan.md"],
  "blocked_reason": null,
  "created_at": "2026-08-27T00:00:00Z",
  "updated_at": "2026-08-27T00:10:00Z",
  "history": []
}
```

History entries record timestamp, previous and next status, actor, and note. Assignment changes are also recorded even when status remains `assigned`.

## Commands

```bash
python3 scripts/manage_tasks.py init
python3 scripts/manage_tasks.py create --title "Align schema" --description "Compare both validators" --owned-path english-review-card/references --owned-path chatgpt-app/src/quiz.ts
python3 scripts/manage_tasks.py create --title "Run cross-surface QA" --depends-on task-0001 --owned-path _workspace/03_qa_report.md
python3 scripts/manage_tasks.py claim --assignee contract-specialist
python3 scripts/manage_tasks.py transition task-0001 --to in_progress --actor contract-specialist
python3 scripts/manage_tasks.py transition task-0001 --to review --actor contract-specialist --artifact _workspace/01_contract_plan.md
python3 scripts/manage_tasks.py transition task-0001 --to completed --actor integration-owner --note "QA passed"
python3 scripts/manage_tasks.py list --ready
python3 scripts/manage_tasks.py list --json
```

Use `--root /path/to/repository` only for tests or when invoking the manager from outside this repository.
