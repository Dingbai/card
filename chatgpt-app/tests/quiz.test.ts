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

test("rejects fewer than five questions", () => {
  const quiz = sampleQuiz();
  quiz.questions = quiz.questions.slice(0, 4);
  assert.equal(quizSchema.safeParse(quiz).success, false);
});

test("rejects an answer that does not match a multiple-choice option", () => {
  const quiz = sampleQuiz();
  quiz.questions[0].accepted_answers = ["Something else"];
  assert.equal(quizSchema.safeParse(quiz).success, false);
});
