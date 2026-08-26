import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from render_review_card import render_fragment, validate_quiz  # noqa: E402


def sample_quiz():
    shared = {
        "explanation_en": "This answer follows the pattern studied today.",
        "explanation_zh": "这个答案符合今天学习的句型。",
    }
    return {
        "title": "Today's English Review",
        "source_summary": "Present perfect, travel vocabulary, and polite requests",
        "questions": [
            {"id": "q1", "type": "multiple_choice", "knowledge_point": "past simple", "prompt": "Choose the correct sentence.", "options": ["I have seen her yesterday.", "I saw her yesterday."], "accepted_answers": ["I saw her yesterday."], **shared},
            {"id": "q2", "type": "fill_in", "knowledge_point": "present perfect", "prompt": "I ___ already finished.", "accepted_answers": ["have", "'ve"], **shared},
            {"id": "q3", "type": "short_answer", "knowledge_point": "polite requests", "prompt": "Ask someone politely to open the window.", "accepted_answers": ["Could you open the window?", "Would you open the window?"], **shared},
            {"id": "q4", "type": "multiple_choice", "knowledge_point": "travel vocabulary", "prompt": "Where do you collect a suitcase?", "options": ["Baggage claim", "Boarding gate"], "accepted_answers": ["Baggage claim"], **shared},
            {"id": "q5", "type": "fill_in", "knowledge_point": "past participle", "prompt": "She has ___ to London.", "accepted_answers": ["gone"], **shared},
        ],
    }


class QuizTests(unittest.TestCase):
    def test_valid_quiz_renders_interactive_fragment(self):
        output = render_fragment(validate_quiz(sample_quiz()))
        self.assertIn("开始今日复习", output)
        self.assertIn("sendFollowUpMessage", output)
        self.assertIn("复练错题", output)
        self.assertNotIn("<html", output.lower())

    def test_requires_exactly_five_questions(self):
        data = sample_quiz()
        data["questions"].pop()
        with self.assertRaisesRegex(ValueError, "exactly five"):
            validate_quiz(data)

    def test_requires_mixed_types(self):
        data = sample_quiz()
        for question in data["questions"]:
            question["type"] = "fill_in"
            question.pop("options", None)
        with self.assertRaisesRegex(ValueError, "multiple-choice"):
            validate_quiz(data)

    def test_escapes_script_breakout(self):
        data = sample_quiz()
        data["source_summary"] = "</script><script>alert(1)</script>"
        output = render_fragment(validate_quiz(data))
        self.assertNotIn("</script><script>alert", output)
        self.assertIn("\\u003c/script\\u003e", output)


if __name__ == "__main__":
    unittest.main()
