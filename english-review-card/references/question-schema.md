# Question data schema

Create UTF-8 JSON with this shape:

```json
{
  "title": "Today's English Review",
  "source_summary": "A short description of the material covered",
  "review_window": {
    "days": 2,
    "start_date": "2026-09-01",
    "end_date": "2026-09-02",
    "timezone": "Asia/Shanghai",
    "summary_count": 2
  },
  "request_started_at_ms": 1787832000000,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "knowledge_point": "present perfect vs. past simple",
      "prompt": "Choose the best sentence.",
      "options": ["I have seen her yesterday.", "I saw her yesterday."],
      "accepted_answers": ["I saw her yesterday."],
      "grading_guidance": "Accept any clear past-simple sentence tied to a finished past time.",
      "explanation_en": "A finished past time takes the past simple.",
      "explanation_zh": "明确结束的过去时间通常使用一般过去时。"
    }
  ]
}
```

## Requirements

- `title`, `source_summary`, and every string must be non-empty.
- `request_started_at_ms` is optional. Include it only when the request for this specific card supplies the exact value, so the card can display its own generation time. Never carry a timing marker over from another card.
- `review_window` is optional and used only for a recent-N-calendar-day request. `days` and `summary_count` are positive integers, the dates use `YYYY-MM-DD`, `start_date` is not after `end_date`, and `timezone` is the timezone used by the summary selector. Do not include a window with zero summaries; ask for study material instead.
- `questions` must contain at least 1 item with unique `id` values. There is no maximum count. Default to five unless the user requested another positive count.
- `type` must be `multiple_choice`, `fill_in`, or `short_answer`.
- Every question needs `knowledge_point`, `prompt`, at least one `accepted_answers` value, `explanation_en`, and `explanation_zh`.
- `grading_guidance` is optional and only valid for `short_answer`. For every newly generated short-answer question, include one concise instruction describing the ideas that make a semantically different answer correct. It is sent to the conversation only when browser-side matching cannot decide.
- Multiple-choice questions need 2–6 unique `options`; an accepted answer must equal one option exactly.
- Fill-in and short-answer questions omit `options`. Put common capitalization, contraction, spelling, and clearly valid synonymous variants in `accepted_answers`.
- Use only the question types requested by the user. Without explicit settings, use at least two types and include multiple choice; prefer all three when the material supports them.
- Do not include HTML in any field.
