import OpenAI from "openai";
import { z } from "zod";

export const REVIEW_TOOL_NAME = "review_english_answer";
export const DEFAULT_REVIEW_MODEL = "gpt-5.6-luna";
export const REVIEW_TIMEOUT_MS = 15_000;

export const reviewInputSchema = z.object({
  question_id: z.string().trim().min(1).max(40),
  prompt: z.string().trim().min(1).max(500),
  knowledge_point: z.string().trim().min(1).max(120),
  grading_guidance: z.string().trim().min(1).max(500),
  learner_answer: z.string().trim().min(1).max(1_000),
  accepted_answers: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
}).strict();

export const reviewResultSchema = z.object({
  question_id: z.string().trim().min(1).max(40),
  verdict: z.enum(["correct", "needs_improvement"]),
  explanation_en: z.string().trim().min(1).max(500),
  explanation_zh: z.string().trim().min(1).max(500),
  suggested_answer: z.string().trim().min(1).max(500).optional(),
}).strict();

export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;

type ResponsesClient = Pick<OpenAI, "responses">;

const modelResultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    question_id: { type: "string" },
    verdict: { type: "string", enum: ["correct", "needs_improvement"] },
    explanation_en: { type: "string" },
    explanation_zh: { type: "string" },
    suggested_answer: { type: ["string", "null"] },
  },
  required: ["question_id", "verdict", "explanation_en", "explanation_zh", "suggested_answer"],
} as const;

export function createReviewClient(apiKey = process.env.OPENAI_API_KEY): OpenAI {
  if (!apiKey) throw new Error("Semantic review is unavailable: OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey, maxRetries: 0, timeout: REVIEW_TIMEOUT_MS });
}

export function semanticReviewErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/OPENAI_API_KEY/.test(message)) return "Semantic review is unavailable: the server is not configured.";
  if (/timed?\s*out|timeout/i.test(message)) return "Semantic review timed out. Please retry.";
  if (/\b429\b|rate.?limit/i.test(message)) return "Semantic review is temporarily rate-limited. Please retry.";
  return "Semantic review is temporarily unavailable. Please retry.";
}

export async function reviewEnglishAnswer(
  rawInput: ReviewInput,
  options: { client?: ResponsesClient; model?: string } = {},
): Promise<ReviewResult> {
  const input = reviewInputSchema.parse(rawInput);
  const client = options.client ?? createReviewClient();
  const response = await client.responses.create({
    model: options.model ?? process.env.OPENAI_REVIEW_MODEL ?? DEFAULT_REVIEW_MODEL,
    store: false,
    reasoning: { effort: "low" },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "english_answer_review",
        strict: true,
        schema: modelResultSchema,
      },
    },
    instructions: [
      "You grade one English learner answer.",
      "Use only the supplied question, knowledge point, grading guidance, and reference answers.",
      "Accept wording that differs from the references when it conveys the required meaning.",
      "Return concise explanations in English and Chinese.",
      "Set suggested_answer to null when the answer is correct; otherwise provide one helpful corrected expression.",
      "Copy question_id exactly.",
    ].join(" "),
    input: JSON.stringify(input),
  });

  if (response.status !== "completed" || !response.output_text) {
    throw new Error("Semantic review did not complete.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("Semantic review returned invalid JSON.");
  }
  if (parsed && typeof parsed === "object" && "suggested_answer" in parsed && parsed.suggested_answer === null) {
    delete parsed.suggested_answer;
  }
  const result = reviewResultSchema.parse(parsed);
  if (result.question_id !== input.question_id) {
    throw new Error("Semantic review returned a mismatched question_id.");
  }
  return result;
}
