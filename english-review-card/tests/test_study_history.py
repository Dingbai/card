import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from manage_study_history import read_history, recent_summaries, record_summary  # noqa: E402


def summary(study_date: str, topic: str, session_id: str | None = None):
    value = {
        "study_date": study_date,
        "timezone": "Asia/Shanghai",
        "source_summary": topic,
        "knowledge_points": [topic],
        "mistakes": [],
    }
    if session_id:
        value["session_id"] = session_id
    return value


class StudyHistoryTests(unittest.TestCase):
    def test_records_idempotently_and_selects_recent_calendar_days(self):
        with tempfile.TemporaryDirectory() as directory:
            history = Path(directory) / "history.jsonl"
            record_summary(history, summary("2026-08-31", "old", "old"))
            record_summary(history, summary("2026-09-01", "day one", "one"))
            record_summary(history, summary("2026-09-02", "day two", "two"))
            replacement = summary("2026-09-02", "updated day two", "two")
            record_summary(history, replacement)
            result = recent_summaries(history, 2, date(2026, 9, 2), "Asia/Shanghai")
            self.assertEqual(result["review_window"]["start_date"], "2026-09-01")
            self.assertEqual(result["review_window"]["summary_count"], 2)
            self.assertEqual([item["source_summary"] for item in result["summaries"]], ["day one", "updated day two"])
            self.assertEqual(len(read_history(history)), 3)

    def test_rejects_empty_knowledge_and_invalid_timezone(self):
        with tempfile.TemporaryDirectory() as directory:
            history = Path(directory) / "history.jsonl"
            invalid = summary("2026-09-02", "topic")
            invalid["knowledge_points"] = []
            with self.assertRaisesRegex(ValueError, "knowledge_points"):
                record_summary(history, invalid)
            invalid = summary("2026-09-02", "topic")
            invalid["timezone"] = "Not/AZone"
            with self.assertRaisesRegex(ValueError, "IANA"):
                record_summary(history, invalid)


if __name__ == "__main__":
    unittest.main()
