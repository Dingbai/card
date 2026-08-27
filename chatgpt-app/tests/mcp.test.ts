import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer, TOOL_NAME } from "../src/app.js";

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
