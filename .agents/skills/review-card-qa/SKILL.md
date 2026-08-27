---
name: review-card-qa
description: Verify English review-card contracts and runtime behavior across the local Python renderer and remote TypeScript MCP app.
---

# Review Card QA

## When to Use

- Use after changes to quiz fields, validation, grading, widget state, follow-up messages, MCP metadata, or deployment routes.
- Use during reviews that need evidence about whether both delivery surfaces still agree.
- Do not use as a substitute for implementing a requested change.

## Required Inputs

- The original request or change plan.
- Producer-side schema and tool metadata.
- Consumer-side renderer/widget code and tests.
- Any changed documentation or deployment configuration.

## Workflow

1. Map the changed producer-to-consumer boundaries before running presence checks.
2. Compare the schema in `english-review-card/references/question-schema.md`, Python validation in `english-review-card/scripts/render_review_card.py`, and Zod validation in `chatgpt-app/src/quiz.ts`.
3. Compare MCP `structuredContent` and resource metadata with the widget's actual reads and runtime behavior.
4. Check that settings and follow-up messages preserve count, selected types, and grounded knowledge points.
5. Run both test suites for any cross-surface change; inspect failures at the boundary instead of weakening assertions.
6. Report `pass`, `fix`, or `redo`, citing exact files and separating confirmed failures from unverified areas.

## Outputs

- A concise QA result in the final response for routine work.
- `_workspace/03_qa_report.md` when the review needs auditability, resumption, or cross-agent consumption.

## Validation Checklist

- Quiz field names, limits, optionality, uniqueness, and question-type rules agree.
- Multiple-choice answers match an option; non-choice questions do not carry options.
- Minimum question count and configured types agree across skill, server, and UI.
- Server output shape matches widget consumption and restoration.
- Local HTML escaping and remote widget rendering do not allow content fields to become executable markup.
- README commands and endpoints match code and configuration.
- Reports never claim coverage for tests or surfaces that were skipped.
