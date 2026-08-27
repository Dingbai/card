---
name: english-review-card
description: Generate an interactive English review card from material actually covered in the current Codex conversation. Use when the user explicitly says today's English study is finished, asks for today's review quiz, or invokes $english-review-card; do not trigger merely because English is mentioned.
---

# English Review Card

Create a configurable review card grounded only in the current conversation.

## Ground the quiz

- Treat explicit completion phrases such as “今天学完了”, “今天的英语学完了”, or “finished studying for today” as the normal trigger. Do not infer completion from an ordinary pause.
- Extract only vocabulary, grammar, expressions, or reading ideas that were actually taught or practiced in the conversation.
- Use five mixed questions by default. If the user specifies a question count or question types, honor those settings instead.
- If there is not enough material for the requested number of grounded questions, do not invent content. Briefly explain what is missing and ask the user to reduce the count or provide more study material.
- Match difficulty to the learner's demonstrated performance and the complexity of the source material.

## Build the question data

Read [references/question-schema.md](references/question-schema.md), then create one JSON file matching that schema. Use 1–20 questions. Unless the user supplied settings, create five questions with a useful mixture of multiple choice, fill-in, and short-answer questions. Keep prompts primarily in English and explanations bilingual.

For short answers, list reasonable synonymous answers in `accepted_answers`. Browser-side grading is deliberately conservative; include common variants that are clearly supported by the conversation.

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

The card owns only ephemeral in-widget state. Do not save results or connect external services.

## Follow-up rounds

The card has one configuration entry, “设置”. It lets the learner choose 1–20 questions and any non-empty combination of multiple choice, fill-in, and short-answer questions. Applying settings sends a Codex follow-up request to generate a replacement card with that exact configuration.

The completed card also sends a Codex follow-up message when the learner chooses “复练错题” or “再来一组”. Preserve the current question count and selected types in follow-up rounds. For a missed-question round, generate different questions focused only on the listed missed knowledge points and grounded in the same conversation. Do not repeat the original wording.
