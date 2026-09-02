import assert from "node:assert/strict";
import test from "node:test";
import { quizSchema } from "../src/quiz.js";

function sampleQuiz() {
  const explanation = { explanation_en: "English explanation.", explanation_zh: "中文解析。" };
  return {
    title: "Today's English Review",
    source_summary: "Past simple and polite requests",
    questions: [
      { id: "q1", type: "multiple_choice", knowledge_point: "past simple", prompt: "Choose one.", options: ["I went.", "I go."], accepted_answers: ["I went."], ...explanation },
      { id: "q2", type: "fill_in", knowledge_point: "past simple", prompt: "I ___ home.", accepted_answers: ["went"], ...explanation },
      { id: "q3", type: "short_answer", knowledge_point: "polite requests", prompt: "Make a polite request.", accepted_answers: ["Could you help me?"], ...explanation },
      { id: "q4", type: "multiple_choice", knowledge_point: "present perfect", prompt: "Choose one.", options: ["I have finished.", "I has finished."], accepted_answers: ["I have finished."], ...explanation },
      { id: "q5", type: "fill_in", knowledge_point: "past participle", prompt: "She has ___.", accepted_answers: ["written"], ...explanation },
    ],
  };
}

test("accepts a grounded five-question mixed quiz", () => {
  assert.equal(quizSchema.parse(sampleQuiz()).questions.length, 5);
});

test("accepts a configured single-type quiz", () => {
  const quiz = sampleQuiz();
  quiz.questions = Array.from({ length: 10 }, (_, index) => ({
    ...quiz.questions[2],
    id: `short-${index + 1}`,
    prompt: `Short-answer prompt ${index + 1}`,
  }));
  assert.equal(quizSchema.parse(quiz).questions.length, 10);
});

test("accepts more than twenty questions", () => {
  const quiz = sampleQuiz();
  quiz.questions = Array.from({ length: 21 }, (_, index) => ({
    ...quiz.questions[1],
    id: `fill-${index + 1}`,
  }));
  assert.equal(quizSchema.parse(quiz).questions.length, 21);
});

test("accepts one question and rejects an empty quiz", () => {
  const quiz = sampleQuiz();
  quiz.questions = quiz.questions.slice(0, 1);
  assert.equal(quizSchema.parse(quiz).questions.length, 1);
  quiz.questions = [];
  assert.equal(quizSchema.safeParse(quiz).success, false);
});

test("publishes no maximum question count in JSON Schema", () => {
  const jsonSchema = quizSchema.toJSONSchema() as any;
  const questions = jsonSchema.properties.questions;
  assert.equal(questions.minItems, 1);
  assert.equal("maxItems" in questions, false);
});

test("accepts the optional end-to-end timing marker", () => {
  const quiz = sampleQuiz();
  const parsed = quizSchema.parse({ ...quiz, request_started_at_ms: 1787832000000 });
  assert.equal(parsed.request_started_at_ms, 1787832000000);
});

test("accepts a positive recent-calendar-day review window", () => {
  const quiz = sampleQuiz();
  const review_window = { days: 2, start_date: "2026-09-01", end_date: "2026-09-02", timezone: "Asia/Shanghai", summary_count: 2 };
  assert.equal(quizSchema.safeParse({ ...quiz, review_window }).success, true);
  assert.equal(quizSchema.safeParse({ ...quiz, review_window: { ...review_window, summary_count: 0 } }).success, false);
  assert.equal(quizSchema.safeParse({ ...quiz, review_window: { ...review_window, start_date: "2026-09-03" } }).success, false);
});

test("rejects an answer that does not match a multiple-choice option", () => {
  const quiz = sampleQuiz();
  quiz.questions[0].accepted_answers = ["Something else"];
  assert.equal(quizSchema.safeParse(quiz).success, false);
});

test("allows grading guidance only on short answers", () => {
  const quiz = sampleQuiz();
  (quiz.questions[2] as any).grading_guidance = "Accept any semantically equivalent polite request.";
  assert.equal(quizSchema.safeParse(quiz).success, true);
  (quiz.questions[1] as any).grading_guidance = "Not valid for fill-in.";
  assert.equal(quizSchema.safeParse(quiz).success, false);
});
