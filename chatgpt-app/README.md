# 英语复习卡片 — 私有 ChatGPT App

本目录包含一个远程 MCP 服务和一个 Apps SDK 交互组件。它与本地的 `english-review-card` Codex Skill 相互独立，本地 Skill 可以继续单独使用。

## 功能

- ChatGPT 根据当前对话中实际学习过的内容生成 5 道题，并调用 `create_english_review_card`。
- MCP 服务严格校验题目结构，然后以结构化内容返回题目。
- 交互组件在客户端完成答题、双语解析、成绩统计和错题复练。
- 服务端不持久化答题结果，也不需要配置 OpenAI API Key。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm ci
npm test
npm start
```

MCP 端点为 `http://localhost:8787/mcp`，健康检查端点为 `http://localhost:8787/health`。

## 私有部署

1. 使用项目自带的 `Dockerfile`，将本目录部署到支持容器的托管服务。
2. 配置托管服务，通过 HTTPS 暴露平台分配的 `PORT`。
3. 确认访问 `https://你的域名/health` 时返回 `{ "ok": true }`。
4. 在 ChatGPT 开发者模式中添加私有远程 MCP App，地址填写 `https://你的域名/mcp`。
5. 在 ChatGPT 中开始英语学习对话；学完后，要求 ChatGPT 根据本次对话生成英语复习卡片。

当前 MCP 端点没有应用层身份认证。原型阶段应仅在自己的 ChatGPT 账号中保留该连接，并使用难以猜测的部署地址。向其他用户开放前，应增加 OAuth 认证。

---

# English Review Card — Private ChatGPT App

This directory contains a remote MCP server and an Apps SDK widget. It is separate from the local `english-review-card` Codex Skill, which remains available independently.

## Behavior

- ChatGPT creates five questions from material in the current conversation and calls `create_english_review_card`.
- The MCP server validates the quiz and returns it as structured content.
- The widget handles answers, bilingual feedback, scoring, and follow-up rounds locally.
- No quiz results are persisted and no OpenAI API key is required by the server.

## Run locally

Node.js 20 or newer is required.

```bash
npm ci
npm test
npm start
```

The MCP endpoint is `http://localhost:8787/mcp` and the health endpoint is `http://localhost:8787/health`.

## Deploy privately

1. Deploy this directory to a container host using the included `Dockerfile`.
2. Configure the host to expose its assigned `PORT` over HTTPS.
3. Confirm `https://YOUR_DOMAIN/health` returns `{ "ok": true }`.
4. In ChatGPT developer mode, add a private remote MCP app with the URL `https://YOUR_DOMAIN/mcp`.
5. Start an English-learning conversation. When finished, ask ChatGPT to create the English review card from the material covered in that conversation.

The MCP endpoint has no application-level authentication. Keep the connector private in ChatGPT and use a hard-to-guess deployment URL for the prototype. Add OAuth before sharing the endpoint with other users.
