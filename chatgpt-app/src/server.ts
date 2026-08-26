import express from "express";
import { randomUUID, webcrypto } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { quizSchema } from "./quiz.js";
import { widgetHtml } from "./widget.js";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

const RESOURCE_URI = "ui://widget/english-review-card.html";

function createServer() {
  const server = new McpServer({ name: "english-review-card", version: "0.1.0" });

  server.registerResource("english-review-card", RESOURCE_URI, {}, async () => ({
    contents: [{
      uri: RESOURCE_URI,
      mimeType: "text/html+skybridge",
      text: widgetHtml,
      _meta: {
        "openai/widgetDescription": "An interactive five-question English review card with bilingual feedback.",
        "openai/widgetPrefersBorder": true,
      },
    }],
  }));

  server.registerTool(
    "create_english_review_card",
    {
      title: "Create English review card",
      description: "Create a five-question interactive English quiz grounded only in material from the current conversation. Use after the learner explicitly finishes studying or asks for a review. If the conversation lacks enough material, do not call this tool; ask for more study content instead.",
      inputSchema: quizSchema,
      _meta: {
        "openai/outputTemplate": RESOURCE_URI,
        "openai/toolInvocation/invoking": "正在生成英语复习卡片…",
        "openai/toolInvocation/invoked": "英语复习卡片已生成",
      },
    },
    async (quiz) => ({
      content: [{ type: "text", text: "The five-question English review card is ready." }],
      structuredContent: quiz,
      _meta: { ephemeral: true },
    }),
  );
  return server;
}

const app = express();
app.use(express.json({ limit: "256kb" }));

const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (request, response) => {
  try {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    let transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport && isInitializeRequest(request.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, transport!);
        },
      });
      transport.onclose = () => {
        if (transport?.sessionId) transports.delete(transport.sessionId);
      };
      await createServer().connect(transport);
    }
    if (!transport) {
      response.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Invalid or missing MCP session" }, id: null });
      return;
    }
    await transport.handleRequest(request, response, request.body);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) response.status(500).json({ error: "Internal server error" });
  }
});

app.get("/mcp", async (request, response) => {
  const transport = transports.get(request.headers["mcp-session-id"] as string);
  if (!transport) return response.status(400).send("Invalid or missing MCP session");
  await transport.handleRequest(request, response);
});

app.delete("/mcp", async (request, response) => {
  const transport = transports.get(request.headers["mcp-session-id"] as string);
  if (!transport) return response.status(400).send("Invalid or missing MCP session");
  await transport.handleRequest(request, response);
});

app.get("/health", (_request, response) => response.json({ ok: true }));

const port = Number(process.env.PORT || 8787);
app.listen(port, "0.0.0.0", (error) => {
  if (error) {
    console.error("Unable to start MCP server", error);
    process.exitCode = 1;
    return;
  }
  console.log(`English review MCP server listening on http://0.0.0.0:${port}/mcp`);
});
