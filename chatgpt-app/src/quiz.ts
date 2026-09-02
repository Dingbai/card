import { z } from "zod";

export const questionTypeSchema = z.enum([
  "multiple_choice",
  "fill_in",
  "short_answer",
]);

const baseQuestionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  type: questionTypeSchema,
  knowledge_point: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(500),
  accepted_answers: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  explanation_en: z.string().trim().min(1).max(800),
  explanation_zh: z.string().trim().min(1).max(800),
  grading_guidance: z.string().trim().min(1).max(500).optional(),
});

export const questionSchema = baseQuestionSchema
  .extend({
    options: z.array(z.string().trim().min(1).max(300)).min(2).max(6).optional(),
  })
  .superRefine((question, context) => {
    if (question.type === "multiple_choice") {
      if (!question.options) {
        context.addIssue({ code: "custom", message: "Multiple-choice questions require options", path: ["options"] });
        return;
      }
      if (!question.accepted_answers.some((answer) => question.options?.includes(answer))) {
        context.addIssue({ code: "custom", message: "An accepted answer must match an option", path: ["accepted_answers"] });
      }
    } else if (question.options) {
      context.addIssue({ code: "custom", message: "Only multiple-choice questions may have options", path: ["options"] });
    }
    if (question.type !== "short_answer" && question.grading_guidance) {
      context.addIssue({ code: "custom", message: "Only short-answer questions may have grading guidance", path: ["grading_guidance"] });
    }
  });

export const quizSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    source_summary: z.string().trim().min(1).max(500),
    request_started_at_ms: z.number().int().positive().optional(),
    questions: z.array(questionSchema).min(1),
  })
  .superRefine((quiz, context) => {
    const ids = quiz.questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "Question ids must be unique", path: ["questions"] });
    }
  });

export type Quiz = z.infer<typeof quizSchema>;
