import assert from "node:assert/strict";
import test from "node:test";
import { createReviewClient, reviewEnglishAnswer, reviewInputSchema, reviewResultSchema, semanticReviewErrorMessage } from "../src/review.js";

const input = {
  question_id: "q3",
  prompt: "How would you politely ask someone to close the window?",
  knowledge_point: "polite requests",
  grading_guidance: "Accept any polite request with the same intent.",
  learner_answer: "Would you mind closing the window?",
  accepted_answers: ["Could you close the window, please?"],
};

function clientReturning(value: unknown, status = "completed") {
  return { responses: { create: async () => ({ status, output_text: typeof value === "string" ? value : JSON.stringify(value) }) } } as any;
}

test("validates semantic review input and output boundaries", () => {
  assert.equal(reviewInputSchema.safeParse(input).success, true);
  assert.equal(reviewInputSchema.safeParse({ ...input, learner_answer: "" }).success, false);
  assert.equal(reviewInputSchema.safeParse({ ...input, accepted_answers: [] }).success, false);
  assert.equal(reviewInputSchema.safeParse({ ...input, extra: true }).success, false);
  assert.equal(reviewResultSchema.safeParse({ question_id: "q3", verdict: "correct", explanation_en: "Equivalent meaning.", explanation_zh: "含义等价。" }).success, true);
  assert.equal(reviewResultSchema.safeParse({ question_id: "q3", verdict: "maybe" }).success, false);
});

test("returns a correct verdict and removes a null suggestion", async () => {
  const result = await reviewEnglishAnswer(input, { client: clientReturning({
    question_id: "q3", verdict: "correct",
    explanation_en: "The wording differs, but it is an equivalent polite request.",
    explanation_zh: "措辞不同，但表达了等价的礼貌请求。", suggested_answer: null,
  }) });
  assert.equal(result.verdict, "correct");
  assert.equal(result.suggested_answer, undefined);
});

test("returns improvement feedback with a suggested answer", async () => {
  const result = await reviewEnglishAnswer(input, { client: clientReturning({
    question_id: "q3", verdict: "needs_improvement",
    explanation_en: "The answer does not ask for the window to be closed.",
    explanation_zh: "该答案没有表达关窗请求。", suggested_answer: "Would you mind closing the window?",
  }) });
  assert.equal(result.verdict, "needs_improvement");
  assert.equal(result.suggested_answer, "Would you mind closing the window?");
});

test("rejects invalid JSON, incomplete responses, and mismatched question ids", async () => {
  await assert.rejects(reviewEnglishAnswer(input, { client: clientReturning("not json") }), /invalid JSON/);
  await assert.rejects(reviewEnglishAnswer(input, { client: clientReturning({}, "incomplete") }), /did not complete/);
  await assert.rejects(reviewEnglishAnswer(input, { client: clientReturning({ question_id: "different", verdict: "correct", explanation_en: "Equivalent meaning.", explanation_zh: "含义等价。", suggested_answer: null }) }), /mismatched question_id/);
});

test("propagates timeout and rate-limit failures without inventing a verdict", async () => {
  for (const message of ["Request timed out", "429 rate limit exceeded"]) {
    const client = { responses: { create: async () => { throw new Error(message); } } } as any;
    await assert.rejects(reviewEnglishAnswer(input, { client }), new RegExp(message));
  }
});

test("requires a server-side API key", () => {
  assert.throws(() => createReviewClient(""), /OPENAI_API_KEY/);
});

test("maps provider failures to safe user-facing messages", () => {
  assert.match(semanticReviewErrorMessage(new Error("OPENAI_API_KEY is missing")), /not configured/);
  assert.match(semanticReviewErrorMessage(new Error("Request timed out at api.openai.com")), /timed out/);
  assert.match(semanticReviewErrorMessage(new Error("429 rate limit exceeded for org internal-name")), /rate-limited/);
  assert.equal(semanticReviewErrorMessage(new Error("secret upstream detail")), "Semantic review is temporarily unavailable. Please retry.");
});
