import express from "express";
import { webcrypto } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { quizSchema } from "./quiz.js";
import { widgetHtml } from "./widget.js";

if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: webcrypto });

export const APP_VERSION = "0.6.0";
export const TOOL_NAME = "create_english_review_card_v2";
const RESOURCE_URI = `ui://widget/english-review-card-v${APP_VERSION}.html`;
const WIDGET_DOMAIN = "https://chatgpt-app-ashy.vercel.app";
const WIDGET_CSP = {
  connectDomains: [],
  resourceDomains: [],
};

export function createMcpServer() {
  const server = new McpServer({ name: "english-review-card", version: APP_VERSION });
  server.registerResource("english-review-card", RESOURCE_URI, {}, async () => ({
    contents: [{ uri: RESOURCE_URI, mimeType: "text/html+skybridge", text: widgetHtml, _meta: {
      ui: {
        prefersBorder: true,
        csp: WIDGET_CSP,
        domain: WIDGET_DOMAIN,
      },
      "openai/widgetDescription": `English Review Card v${APP_VERSION}, with configurable questions and bilingual feedback.`,
      "openai/widgetPrefersBorder": true,
      "openai/widgetCSP": {
        connect_domains: WIDGET_CSP.connectDomains,
        resource_domains: WIDGET_CSP.resourceDomains,
      },
      "openai/widgetDomain": WIDGET_DOMAIN,
    } }],
  }));
  server.registerTool(TOOL_NAME, {
    title: "Create English review card",
    description: "Create one interactive English review card grounded only in the current conversation. Questions has no maximum count: put the user's exact requested positive number of questions in this single call; default to 5 mixed questions only when no count was requested. Honor requested types, keep each bilingual explanation to one concise sentence, and copy request_started_at_ms exactly when the request supplies it. If there is not enough study material, ask for more instead of calling the tool.",
    inputSchema: quizSchema,
    outputSchema: quizSchema,
    _meta: {
      ui: { resourceUri: RESOURCE_URI },
      "openai/outputTemplate": RESOURCE_URI,
      "openai/toolInvocation/invoking": "正在生成英语复习卡片…",
      "openai/toolInvocation/invoked": "英语复习卡片已生成",
    },
  }, async (quiz) => ({
    content: [{ type: "text", text: `The ${quiz.questions.length}-question English review card is ready.` }],
    structuredContent: quiz,
  }));
  return server;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "256kb" }));
  app.get("/", (_request, response) => {
    response.type("html").send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>英语复习卡片 · ChatGPT App</title>
  <style>
    :root{color-scheme:light dark;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f7fb;color:#172033}*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#eef2ff,#f9fbff)}main{width:min(680px,100%);padding:32px;border:1px solid #dce2ee;border-radius:20px;background:#fff;box-shadow:0 18px 48px rgba(35,52,90,.12)}.label{margin:0 0 10px;color:#315cff;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}h1{margin:0;font-size:clamp(28px,6vw,42px)}p{color:#5e687c;line-height:1.7}.status{display:flex;align-items:center;gap:9px;margin:24px 0}.dot{width:10px;height:10px;border-radius:50%;background:#20a464;box-shadow:0 0 0 5px #e2f7eb}code{display:block;overflow-wrap:anywhere;padding:14px;border-radius:12px;background:#f1f4ff;color:#25304a}a{color:#315cff}@media(prefers-color-scheme:dark){:root{background:#11141c;color:#eef2ff}body{background:linear-gradient(145deg,#11141c,#1c2233)}main{border-color:#343948;background:#171a23;box-shadow:none}p{color:#b4bdd1}code{background:#242c49;color:#eef2ff}.dot{box-shadow:0 0 0 5px #173428}}
  </style>
</head>
<body>
  <main>
    <p class="label">Private ChatGPT App</p>
    <h1>英语复习卡片</h1>
    <div class="status"><span class="dot" aria-hidden="true"></span><strong>MCP 服务运行中</strong></div>
    <p>这个页面用于确认服务已经成功部署。学习卡片需要在 ChatGPT 中连接 MCP 地址后使用，不会直接显示在普通浏览器首页。</p>
    <p><strong>ChatGPT MCP 地址</strong></p>
    <code>https://chatgpt-app-ashy.vercel.app/api/mcp</code>
    <p><a href="/api/health">查看健康检查</a></p>
  </main>
</body>
</html>`);
  });
  app.post(["/mcp", "/api/mcp"], async (request, response) => {
    const startedAt = performance.now();
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try {
      const initializedAt = performance.now();
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
      const completedAt = performance.now();
      console.info("mcp_request", {
        method: request.body?.method ?? "unknown",
        initMs: Math.round(initializedAt - startedAt),
        mcpMs: Math.round(completedAt - initializedAt),
        totalMs: Math.round(completedAt - startedAt),
      });
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
