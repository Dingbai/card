# Repository Agents Guide

## What

- This repository ships the same English review-card experience through two independent surfaces: the local Codex skill in `english-review-card/` and the remote ChatGPT MCP app in `chatgpt-app/`.
- The quiz contract is duplicated intentionally across `english-review-card/references/question-schema.md`, the Python renderer, and `chatgpt-app/src/quiz.ts`; changes to one contract must be checked against all consumers.
- Generated or compiled output is not a source of truth. Edit source files and tests, not `chatgpt-app/dist/`.

## Why

- Both surfaces must grade and explain the same grounded quiz data even though they use different runtimes.
- The local skill remains standalone; the MCP app must not become a hidden dependency of it.
- Neither surface persists learner answers on the server.

## How

- Local skill tests: `python3 -m unittest discover -s english-review-card/tests -v`
- ChatGPT app checks: `cd chatgpt-app && npm test`
- Type-only app check: `cd chatgpt-app && npm run check`
- For cross-surface changes, run both test suites and compare producer/consumer contracts explicitly.
- Use `.agents/skills/review-card-orchestrator/SKILL.md` for feature or contract changes spanning multiple surfaces. The durable role, handoff, and failure policy is in `docs/harness/review-card/team-spec.md`.
- For delegated or resumable work, use `python3 scripts/manage_tasks.py` and persist state under `_workspace/tasks/`; read `.agents/skills/review-card-supervisor/SKILL.md` before changing task ownership or status.
