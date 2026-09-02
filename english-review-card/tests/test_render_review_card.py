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
        self.assertIn('data-action="settings"', output)
        self.assertIn("更新卡片", output)
        self.assertIn("data-setting-count", output)
        self.assertIn("data-setting-type", output)
        self.assertIn("至少 1 题，无上限", output)
        self.assertIn("request_started_at_ms", output)
        self.assertIn("本卡生成", output)
        self.assertNotIn("初次加载", output)
        self.assertIn('data-view="loading"', output)
        self.assertIn("erc-skeleton", output)
        self.assertIn("settingsButton.hidden=true", output)
        self.assertIn("cancelSettings", output)
        self.assertIn("Daily English Review · v0.7.0", output)
        self.assertIn("scrollToBottom:true", output)
        self.assertIn("questionCount=missed.length||quiz.questions.length", output)
        self.assertIn("best.similarity>=.8", output)
        self.assertIn("Correct with a spelling note!", output)
        self.assertIn("state.locked?next():submit()", output)
        self.assertIn("event.shiftKey", output)
        self.assertIn("Needs semantic review", output)
        self.assertIn("requestModelReview", output)
        self.assertIn("题目数量必须等于本轮", output)
        self.assertNotIn("prompt,title", output)
        self.assertNotIn("<html", output.lower())

    def test_grading_guidance_is_only_valid_for_short_answers(self):
        data = sample_quiz()
        data["questions"][2]["grading_guidance"] = "Accept a polite request with the intended meaning."
        self.assertEqual(validate_quiz(data)["questions"][2]["grading_guidance"], "Accept a polite request with the intended meaning.")
        data["questions"][1]["grading_guidance"] = "Not valid here."
        with self.assertRaisesRegex(ValueError, "only valid for short_answer"):
            validate_quiz(data)

    def test_accepts_a_configured_question_count_and_single_type(self):
        data = sample_quiz()
        template = data["questions"][1]
        data["questions"] = [{**template, "id": f"q{index}"} for index in range(21)]
        output = render_fragment(validate_quiz(data))
        self.assertIn("21 questions", output)

    def test_accepts_one_question_and_rejects_an_empty_quiz(self):
        data = sample_quiz()
        data["questions"] = data["questions"][:1]
        self.assertEqual(len(validate_quiz(data)["questions"]), 1)
        data["questions"] = []
        with self.assertRaisesRegex(ValueError, "at least 1"):
            validate_quiz(data)

    def test_accepts_request_timing_marker(self):
        data = sample_quiz()
        data["request_started_at_ms"] = 1787832000000
        self.assertEqual(validate_quiz(data)["request_started_at_ms"], 1787832000000)

    def test_escapes_script_breakout(self):
        data = sample_quiz()
        data["source_summary"] = "</script><script>alert(1)</script>"
        output = render_fragment(validate_quiz(data))
        self.assertNotIn("</script><script>alert", output)
        self.assertIn("\\u003c/script\\u003e", output)


if __name__ == "__main__":
    unittest.main()
