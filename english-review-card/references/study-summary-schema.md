# Dated study summary

The local skill stores one JSON object per line in `.english-review-card/history.jsonl`:

```json
{
  "study_date": "2026-09-02",
  "timezone": "Asia/Shanghai",
  "session_id": "optional-stable-session-id",
  "source_summary": "Airport expressions and the present perfect",
  "knowledge_points": ["baggage claim", "gone vs. went"],
  "mistakes": ["Used went after has"]
}
```

- `study_date` is the learner-local calendar date in `timezone`.
- `timezone` is a valid IANA timezone. Use `Asia/Shanghai` by default.
- `session_id` is optional. When omitted, the history script derives a stable content identifier, so retrying the same summary replaces it instead of duplicating it.
- `knowledge_points` is non-empty. `mistakes` may be empty.
- Do not store raw conversation transcripts or learner answers in history.
