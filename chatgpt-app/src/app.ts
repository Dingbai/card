import express from "express";
import { webcrypto } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { quizSchema } from "./quiz.js";
import { widgetHtml } from "./widget.js";

if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: webcrypto });

const RESOURCE_URI = "ui://widget/english-review-card.html";

export function createMcpServer() {
  const server = new McpServer({ name: "english-review-card", version: "0.2.0" });
  server.registerResource("english-review-card", RESOURCE_URI, {}, async () => ({
    contents: [{ uri: RESOURCE_URI, mimeType: "text/html+skybridge", text: widgetHtml, _meta: {
      "openai/widgetDescription": "An interactive five-question English review card with bilingual feedback.",
      "openai/widgetPrefersBorder": true,
    } }],
  }));
  server.registerTool("create_english_review_card", {
    title: "Create English review card",
    description: "Create a five-question interactive English quiz grounded only in material from the current conversation. Use after the learner explicitly finishes studying or asks for a review. If the conversation lacks enough material, do not call this tool; ask for more study content instead.",
    inputSchema: quizSchema,
    _meta: {
      "openai/outputTemplate": RESOURCE_URI,
      "openai/toolInvocation/invoking": "正在生成英语复习卡片…",
      "openai/toolInvocation/invoked": "英语复习卡片已生成",
    },
  }, async (quiz) => ({
    content: [{ type: "text", text: "The five-question English review card is ready." }],
    structuredContent: quiz,
    _meta: { ephemeral: true },
  }));
  return server;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "256kb" }));
  app.post(["/mcp", "/api/mcp"], async (request, response) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      console.error(error);
      if (!response.headersSent) response.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
    response.on("close", () => { void transport.close(); void server.close(); });
  });
  app.get(["/mcp", "/api/mcp"], (_request, response) => response.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }));
  app.delete(["/mcp", "/api/mcp"], (_request, response) => response.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }));
  app.get(["/health", "/api/health"], (_request, response) => response.json({ ok: true }));
  return app;
}

export default createApp();
