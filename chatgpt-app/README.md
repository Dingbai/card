# 英语复习卡片 — 私有 ChatGPT App

本目录包含一个远程 MCP 服务和一个 Apps SDK 交互组件。它与本地的 `english-review-card` Codex Skill 相互独立，本地 Skill 可以继续单独使用。

## 功能

- ChatGPT 根据当前对话中实际学习过的内容生成复习题，并调用 `create_english_review_card_v2`。默认 5 题；用户明确指定时支持任意正数题目且无上限。
- MCP 服务严格校验题目结构，然后以结构化内容返回题目。
- 交互组件在客户端完成答题、双语解析、成绩统计和错题复练，并通过组件状态恢复当前卡片和答题进度。
- 服务端不持久化答题结果，也不需要配置 OpenAI API Key。
- MCP 请求会输出 `mcp_request` 结构化耗时日志；组件控制台会输出 `english_review_card_ready` 启动与恢复耗时。
- 卡片标题下方显示展示/缓存恢复耗时；从卡片按钮发起的新一轮还会显示从点击到新卡展示的端到端生成耗时。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm ci
npm test
npm start
```

MCP 端点为 `http://localhost:8787/mcp`，健康检查端点为 `http://localhost:8787/health`。部署到 Vercel 后对应地址为 `/api/mcp` 和 `/api/health`。

## 私有部署

1. 在 Vercel 中导入 GitHub 仓库，并将 Root Directory 设置为 `chatgpt-app`。
2. 保持 Framework Preset 为 Other，不需要配置环境变量。
3. 确认访问 `https://你的域名/api/health` 时返回 `{ "ok": true }`。
4. 在 ChatGPT 开发者模式中添加私有远程 MCP App，地址填写 `https://你的域名/api/mcp`。
5. 在 ChatGPT 中开始英语学习对话；学完后，要求 ChatGPT 根据本次对话生成英语复习卡片。

当前 MCP 端点没有应用层身份认证。原型阶段应仅在自己的 ChatGPT 账号中保留该连接，并使用难以猜测的部署地址。向其他用户开放前，应增加 OAuth 认证。

---

# English Review Card — Private ChatGPT App

This directory contains a remote MCP server and an Apps SDK widget. It is separate from the local `english-review-card` Codex Skill, which remains available independently.

## Behavior

- ChatGPT creates grounded questions from the current conversation and calls `create_english_review_card_v2`. It defaults to five, while explicit positive counts have no maximum.
- The MCP server validates the quiz and returns it as structured content.
- The widget handles answers, bilingual feedback, scoring, and follow-up rounds locally, and restores the current card and progress from widget state.
- No quiz results are persisted on the server, and no OpenAI API key is required by the server.
- MCP requests emit structured `mcp_request` timing logs; the widget console emits `english_review_card_ready` boot and restore timing.
- The card displays render/cache-restore time below its title; rounds launched from a card button also show end-to-end time from click to the new card display.

## Run locally

Node.js 20 or newer is required.

```bash
npm ci
npm test
npm start
```

The MCP endpoint is `http://localhost:8787/mcp` and the health endpoint is `http://localhost:8787/health`. On Vercel, the corresponding paths are `/api/mcp` and `/api/health`.

## Deploy privately

1. Import the GitHub repository in Vercel and set the Root Directory to `chatgpt-app`.
2. Keep the Framework Preset set to Other; no environment variables are required.
3. Confirm `https://YOUR_DOMAIN/api/health` returns `{ "ok": true }`.
4. In ChatGPT developer mode, add a private remote MCP app with the URL `https://YOUR_DOMAIN/api/mcp`.
5. Start an English-learning conversation. When finished, ask ChatGPT to create the English review card from the material covered in that conversation.

The MCP endpoint has no application-level authentication. Keep the connector private in ChatGPT and use a hard-to-guess deployment URL for the prototype. Add OAuth before sharing the endpoint with other users.
