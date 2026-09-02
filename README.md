# English Review Card

[简体中文](README.zh-CN.md) | English

English Review Card turns material actually covered in an English-learning conversation into an interactive, bilingual quiz. This repository delivers the same experience through two independent surfaces:

- **Local Codex skill** (`english-review-card/`): generates a self-contained review card in Codex and keeps minimal, dated study summaries locally.
- **ChatGPT MCP app** (`chatgpt-app/`): exposes a remote MCP tool and an Apps SDK widget for use in ChatGPT.

The two surfaces share the same product rules and quiz contract, but neither depends on the other at runtime.

## Features

- Builds questions only from vocabulary, grammar, expressions, and reading ideas covered in the conversation.
- Uses five mixed questions by default and supports any positive question count plus multiple-choice, fill-in, and short-answer formats.
- Provides bilingual explanations, scoring, missed-question practice, and additional rounds.
- Accepts spelling-tolerant fill-in and short answers; ambiguous short answers can be sent back to the conversation model for semantic review.
- Restores in-progress card state in the ChatGPT widget without persisting learner answers on the server.
- Supports recent-calendar-day review from minimal local summaries in the Codex skill.

## Repository layout

```text
.
├── english-review-card/   # Local Codex skill, Python renderer, schemas, and tests
├── chatgpt-app/           # TypeScript MCP server, Apps SDK widget, and tests
├── docs/harness/          # Cross-surface roles, invariants, and QA workflow
├── scripts/               # Persistent task-ledger tooling
├── tests/                 # Tests for repository-level tooling
└── .github/workflows/     # CI and Vercel production deployment
```

## Requirements

- Python 3.9 or newer for the local renderer and repository tooling
- Node.js 20 or newer for the ChatGPT app
- npm (with `npm ci`) for reproducible app dependencies

## Quick start

### Local Codex skill

Install or link `english-review-card/` as a Codex skill, then finish an English-learning conversation with an explicit request such as “done,” “学完了,” or “start a review.” The skill creates quiz JSON from the conversation and renders an interactive HTML card.

To verify the local implementation:

```bash
python3 -m unittest discover -s english-review-card/tests -v
```

The local skill may write minimal dated summaries to `.english-review-card/history.jsonl`. It does not store raw transcripts, full learner answers, quiz progress, or answer history.

### ChatGPT MCP app

```bash
cd chatgpt-app
npm ci
npm test
npm start
```

The local endpoints are:

- MCP: `http://localhost:8787/mcp`
- Health: `http://localhost:8787/health`

The server requires no OpenAI API key. See [`chatgpt-app/README.md`](chatgpt-app/README.md) for private Vercel deployment, production verification, rollback behavior, and ChatGPT connection instructions.

## Development and verification

The quiz contract is intentionally duplicated across the schema, Python renderer, and TypeScript app. When changing shared behavior, update and verify every affected producer and consumer rather than treating generated output as source code.

Run the complete local verification set from the repository root:

```bash
python3 -m unittest discover -s english-review-card/tests -v
python3 -m unittest discover -s tests -v
cd chatgpt-app
npm ci
npm run check
npm test
```

Useful references:

- [`english-review-card/SKILL.md`](english-review-card/SKILL.md) — local skill behavior and workflow
- [`english-review-card/references/question-schema.md`](english-review-card/references/question-schema.md) — canonical quiz data shape
- [`english-review-card/references/study-summary-schema.md`](english-review-card/references/study-summary-schema.md) — local study-summary format
- [`docs/harness/review-card/team-spec.md`](docs/harness/review-card/team-spec.md) — cross-surface ownership and validation matrix

Do not edit `chatgpt-app/dist/`; it is compiled output.

## Deployment

The ChatGPT app is designed for a private Vercel deployment with `chatgpt-app` as the Vercel Root Directory. New ChatGPT connections use `/api/mcp-v2`; `/api/mcp` remains as a compatibility endpoint.

The GitHub Actions workflow tests both surfaces before production deployment. It verifies the health and MCP contracts and rolls back to the previous healthy deployment if post-deployment checks fail. The first healthy production deployment must be bootstrapped manually to provide a rollback target.

## Privacy and security

- The MCP server does not persist quiz answers or require an OpenAI API key.
- The local skill stores only structured summaries, knowledge points, and mistakes for recent-day review.
- The MCP endpoint has no application-level authentication. Keep prototype deployments private and add OAuth before sharing them with other users.

## License

No license file is currently included. Unless a license is added, all rights are reserved by the repository owner.
