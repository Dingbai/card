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
