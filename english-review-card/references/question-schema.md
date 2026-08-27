# Question data schema

Create UTF-8 JSON with this shape:

```json
{
  "title": "Today's English Review",
  "source_summary": "A short description of the material covered",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "knowledge_point": "present perfect vs. past simple",
      "prompt": "Choose the best sentence.",
      "options": ["I have seen her yesterday.", "I saw her yesterday."],
      "accepted_answers": ["I saw her yesterday."],
      "explanation_en": "A finished past time takes the past simple.",
      "explanation_zh": "明确结束的过去时间通常使用一般过去时。"
    }
  ]
}
```

## Requirements

- `title`, `source_summary`, and every string must be non-empty.
- `questions` must contain 1–20 items with unique `id` values. Default to five unless the user requested another count.
- `type` must be `multiple_choice`, `fill_in`, or `short_answer`.
- Every question needs `knowledge_point`, `prompt`, at least one `accepted_answers` value, `explanation_en`, and `explanation_zh`.
- Multiple-choice questions need 2–6 unique `options`; an accepted answer must equal one option exactly.
- Fill-in and short-answer questions omit `options`. Put common capitalization, contraction, spelling, and clearly valid synonymous variants in `accepted_answers`.
- Use only the question types requested by the user. Without explicit settings, use at least two types and include multiple choice; prefer all three when the material supports them.
- Do not include HTML in any field.
