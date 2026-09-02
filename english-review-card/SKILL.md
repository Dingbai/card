---
name: english-review-card
description: Generate an interactive English review card from material actually covered in the current Codex conversation. Use when the user explicitly finishes with phrases such as done or 学完了, asks to start a review, or invokes $english-review-card; do not trigger merely because English is mentioned.
---

# English Review Card

Create a configurable review card grounded in the current conversation or in dated local summaries explicitly selected for a recent-day review.

## Ground the quiz

- Treat explicit completion or review phrases such as “done”, “finished”, “学完了”, “今天学完了”, “开始复习”, “复习一下”, or “finished studying for today” as normal triggers. A bare “复习” or “review” is a trigger only when the surrounding request clearly asks to generate or begin the card; do not infer completion from an ordinary pause or a discussion about review methods.
- Extract only vocabulary, grammar, expressions, or reading ideas that were actually taught or practiced in the conversation.
- Use five mixed questions by default. If the user specifies any positive question count or question types, honor those settings instead; there is no maximum count.
- If there is not enough material for the requested number of grounded questions, do not invent content. Briefly explain what is missing and ask the user to reduce the count or provide more study material.
- Match difficulty to the learner's demonstrated performance and the complexity of the source material.

## Maintain dated summaries

Read [references/study-summary-schema.md](references/study-summary-schema.md). On an explicit completion trigger such as `done` or “学完了”, create a compact summary JSON from material actually covered, using the learner-local date and `Asia/Shanghai` unless the user supplied another timezone. Record it before generating the card:

```bash
python3 scripts/manage_study_history.py record SUMMARY.json
```

Store only the structured summary, knowledge points, and mistakes—never the raw transcript or full learner answers. Retrying an equivalent summary is idempotent.

When the user requests the most recent positive number of calendar days, select summaries first:

```bash
python3 scripts/manage_study_history.py recent --days N --timezone Asia/Shanghai
```

Ground the quiz only in the returned `summaries`, copy the returned `review_window` into the quiz, and state the covered date range in `source_summary`. If `summary_count` is zero, explain that no saved material exists in that range instead of inventing questions. A scheduled local task may call the same record command, but it must receive grounded study material; scheduling alone does not grant access to unrelated conversations.

## Build the question data

Read [references/question-schema.md](references/question-schema.md), then create one JSON file matching that schema. Use at least one question, with no maximum count. Unless the user supplied settings, create five questions with a useful mixture of multiple choice, fill-in, and short-answer questions. Keep prompts primarily in English and explanations bilingual. When a card follow-up supplies `request_started_at_ms`, copy it exactly into the quiz so the next card can display end-to-end generation time.

For short answers, list reasonable synonymous answers in `accepted_answers` and always add concise `grading_guidance` describing the meaning or ideas required for a correct response. Browser-side grading remains conservative: exact and spelling-tolerant matches are immediate, while an unmatched short answer is offered to the model for semantic review in the conversation instead of being presented as definitively wrong.

## Render and present

Run:

```bash
python3 scripts/render_review_card.py QUESTIONS.json OUTPUT.html
```

Write `OUTPUT.html` to the current thread's writable visualization directory when available, otherwise to a task-owned temporary directory. The script emits a Codex-compatible HTML fragment.

Return a short introduction followed by this content reference on its own line:

```text
visualize{"path":"/absolute/path/to/OUTPUT.html"}
```

The card owns only ephemeral answer state. The local skill may persist the minimal dated study summaries described above; do not persist raw answers, quiz progress, or transcripts, and do not connect external services.

## Follow-up rounds

The card has one configuration entry, “设置”. It lets the learner choose any positive question count, with no maximum, and any non-empty combination of multiple choice, fill-in, and short-answer questions. Applying settings sends a Codex follow-up request to generate a replacement card with that exact configuration.

The completed card also sends a Codex follow-up message when the learner chooses “复练错题” or “再来一组”. Preserve the selected types in follow-up rounds. Preserve the current question count for “再来一组”; for “复练错题”, generate exactly one new question per missed question. A missed-question round must focus only on the listed missed knowledge points, remain grounded in the same conversation, and avoid the original wording.
