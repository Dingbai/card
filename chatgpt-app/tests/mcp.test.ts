import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  COMPATIBLE_RESOURCE_URIS,
  CURRENT_RESOURCE_URI,
  TOOL_NAME,
  createMcpServer,
} from "../src/app.js";
import { REVIEW_TOOL_NAME } from "../src/review.js";

function tenQuestionQuiz() {
  return {
    title: "Ten-question review",
    source_summary: "Material covered in the current conversation",
    questions: Array.from({ length: 10 }, (_, index) => ({
      id: `q${index + 1}`,
      type: "fill_in" as const,
      knowledge_point: "reviewed phrase",
      prompt: `Complete reviewed phrase ${index + 1}: ___`,
      accepted_answers: [`answer ${index + 1}`],
      explanation_en: "This answer matches the reviewed phrase.",
      explanation_zh: "该答案与复习过的短语一致。",
    })),
  };
}

test("publishes the uncapped v2 question schema through MCP tools/list", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  const client = new Client({ name: "review-card-test", version: "1.0.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const response = await client.listTools();
    const tool = response.tools.find((candidate) => candidate.name === TOOL_NAME);
    assert.ok(tool, `Expected ${TOOL_NAME} in tools/list`);
    assert.equal(response.tools.some((candidate) => candidate.name === "create_english_review_card"), false);

    const questions = (tool.inputSchema.properties?.questions ?? {}) as Record<string, unknown>;
    assert.equal(questions.minItems, 1);
    assert.equal("maxItems" in questions, false);
  } finally {
    await client.close();
    await server.close();
  }
});

test("lists and reads the current and immediately previous widget resources", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  const client = new Client({ name: "review-card-test", version: "1.0.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const response = await client.listResources();
    assert.deepEqual(response.resources.map((resource) => resource.uri).sort(), [...COMPATIBLE_RESOURCE_URIS].sort());
    for (const uri of COMPATIBLE_RESOURCE_URIS) {
      const resource = await client.readResource({ uri });
      assert.equal(resource.contents.length, 1);
      assert.equal(resource.contents[0]?.uri, uri);
      assert.equal(resource.contents[0]?.mimeType, "text/html+skybridge");
    }
  } finally {
    await client.close();
    await server.close();
  }
});

test("rejects widget resources outside the compatibility window", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  const client = new Client({ name: "review-card-test", version: "1.0.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    await assert.rejects(
      client.readResource({ uri: "ui://widget/english-review-card-v0.4.0.html" }),
      /Resource .* not found/i,
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test("creates all ten requested questions in one v2 tool call", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  const client = new Client({ name: "review-card-test", version: "1.0.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const response = await client.callTool({ name: TOOL_NAME, arguments: tenQuestionQuiz() });
    const structuredContent = response.structuredContent as ReturnType<typeof tenQuestionQuiz>;
    assert.equal(structuredContent.questions.length, 10);
    const tools = await client.listTools();
    const tool = tools.tools.find((candidate) => candidate.name === TOOL_NAME);
    assert.equal(tool?._meta?.["openai/outputTemplate"], CURRENT_RESOURCE_URI);
  } finally {
    await client.close();
    await server.close();
  }
});

test("exposes a widget-callable read-only semantic review tool", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer({ reviewAnswer: async (input) => ({
    question_id: input.question_id,
    verdict: "correct",
    explanation_en: "The answer has the required meaning.",
    explanation_zh: "答案表达了要求的含义。",
  }) });
  const client = new Client({ name: "review-card-test", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const tools = await client.listTools();
    const tool = tools.tools.find((candidate) => candidate.name === REVIEW_TOOL_NAME);
    assert.equal(tool?.annotations?.readOnlyHint, true);
    assert.equal(tool?._meta?.["openai/widgetAccessible"], true);
    assert.equal(tool?._meta?.["openai/outputTemplate"], undefined);
    const response = await client.callTool({ name: REVIEW_TOOL_NAME, arguments: {
      question_id: "q3", prompt: "Make a polite request.", knowledge_point: "polite requests",
      grading_guidance: "Accept equivalent polite requests.", learner_answer: "Would you mind helping me?",
      accepted_answers: ["Could you help me, please?"],
    } });
    assert.equal(response.isError, undefined);
    assert.equal((response.structuredContent as { verdict?: string })?.verdict, "correct");
  } finally {
    await client.close();
    await server.close();
  }
});

test("returns semantic review provider failures as MCP tool errors", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer({ reviewAnswer: async () => { throw new Error("Semantic review is temporarily unavailable."); } });
  const client = new Client({ name: "review-card-test", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const response = await client.callTool({ name: REVIEW_TOOL_NAME, arguments: {
      question_id: "q3", prompt: "Make a polite request.", knowledge_point: "polite requests",
      grading_guidance: "Accept equivalent polite requests.", learner_answer: "Please help.",
      accepted_answers: ["Could you help me, please?"],
    } });
    assert.equal(response.isError, true);
    assert.equal(response.structuredContent, undefined);
    const content = response.content as Array<{ type: string; text?: string }>;
    assert.equal(content[0]?.text, "Semantic review is temporarily unavailable. Please retry.");
  } finally {
    await client.close();
    await server.close();
  }
});
