# 英语复习卡片 — 私有 ChatGPT App

本目录包含一个远程 MCP 服务和一个 Apps SDK 交互组件。它与本地的 `english-review-card` Codex Skill 相互独立，本地 Skill 可以继续单独使用。

## 功能

- ChatGPT 根据当前对话中实际学习过的内容生成复习题，并调用 `create_english_review_card_v2`。默认 5 题；用户明确指定时支持任意正数题目且无上限。
- `done`、`finished`、`学完了`、`开始复习`、`复习一下` 等明确表达可以触发卡片；单独的“复习/review”只在上下文明确要求开始卡片时触发。
- 答题时 Enter 提交答案，反馈出现后 Enter 进入下一题；简答题使用 Shift+Enter 换行。填空题和简答题逐词拼写相似度达到 80% 时按正确计，并显示推荐拼写。
- 新生成的简答题携带 `grading_guidance`。本地匹配无法确认的答案显示“需要语义复核”，用户可将答案和评分指导提交给当前对话中的模型判断；复核结果显示在对话中，不会静默改写已保存的卡片成绩。
- 最近 N 天卡片使用 `review_window` 显示自然日范围、时区和摘要数量。当前 Vercel MCP 不带跨聊天数据库，只能使用当前对话可见或明确提供的摘要；不要把它描述为自动读取其他聊天。完整的本地持久化由 Codex skill 的 `.english-review-card/history.jsonl` 提供。
- MCP 服务严格校验题目结构，然后以结构化内容返回题目。
- 交互组件在客户端完成答题、双语解析、成绩统计和错题复练，并通过组件状态恢复当前卡片和答题进度。
- 服务端不持久化答题结果，也不需要配置 OpenAI API Key。
- MCP 请求会输出 `mcp_request` 结构化耗时日志；组件控制台会输出 `english_review_card_ready` 当前卡片生成耗时。
- 卡片生成与数据加载期间显示占位状态；标题下方只显示当前卡片自身的生成耗时，不累计加载时间或其他卡片的时间。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm ci
npm test
npm start
```

MCP 端点为 `http://localhost:8787/mcp`，健康检查端点为 `http://localhost:8787/health`。部署到 Vercel 后，新连接使用 `/api/mcp-v2`，旧 `/api/mcp` 保留兼容。

## 私有部署

1. 在 Vercel 中导入 GitHub 仓库，并将 Root Directory 设置为 `chatgpt-app`。
2. 保持 Framework Preset 为 Other，不需要配置环境变量。
3. 确认访问 `https://你的域名/api/health` 时返回版本、工具名、当前资源 URI 和兼容资源 URI；不要只检查 `ok`。
4. 对已部署端点运行 `npm run smoke -- https://你的域名/api/mcp-v2`。脚本会依次初始化 MCP、检查工具 schema、列出并读取当前及上一版资源，再单次调用 v2 工具验证 10 题返回。
5. 删除 ChatGPT 中指向旧 `/api/mcp` 的连接，再以 `https://你的域名/api/mcp-v2` 新建私有远程 MCP App。新 URL 用于强制重新发现工具目录。
6. 在 ChatGPT 中开始英语学习对话；学完后，要求 ChatGPT 根据本次对话生成英语复习卡片。

每次升级 `APP_VERSION` 时，同时把 `PREVIOUS_APP_VERSION` 更新为升级前版本。服务只兼容当前版与紧邻的上一版 widget URI。如果冒烟检查仍发现旧工具或旧 schema，应核对 Vercel 项目、部署 commit、Root Directory 和 ChatGPT 中保存的 MCP 地址，不要继续修改题目业务逻辑。

当前 MCP 端点没有应用层身份认证。原型阶段应仅在自己的 ChatGPT 账号中保留该连接，并使用难以猜测的部署地址。向其他用户开放前，应增加 OAuth 认证。

---

# English Review Card — Private ChatGPT App

This directory contains a remote MCP server and an Apps SDK widget. It is separate from the local `english-review-card` Codex Skill, which remains available independently.

## Behavior

- ChatGPT creates grounded questions from the current conversation and calls `create_english_review_card_v2`. It defaults to five, while explicit positive counts have no maximum.
- The MCP server validates the quiz and returns it as structured content.
- The widget handles answers, bilingual feedback, scoring, and follow-up rounds locally, and restores the current card and progress from widget state.
- No quiz results are persisted on the server, and no OpenAI API key is required by the server.
- MCP requests emit structured `mcp_request` timing logs; the widget console emits the current card's generation time through `english_review_card_ready`.
- The card shows placeholders while generation and card data are loading. Below its title it displays only the current card's own generation time, without adding load time or timing from other cards.

## Run locally

Node.js 20 or newer is required.

```bash
npm ci
npm test
npm start
```

The MCP endpoint is `http://localhost:8787/mcp` and the health endpoint is `http://localhost:8787/health`. On Vercel, new connections use `/api/mcp-v2`; the old `/api/mcp` remains compatible.

## Deploy privately

Production deployment is owned by `.github/workflows/ci-cd.yml`. Pull requests to `main` run the local Skill tests, task-tooling tests, TypeScript check, and app tests. A push to `main` repeats those checks, builds once with Vercel CLI, deploys the prebuilt artifact to Production, and verifies both `/api/health` and `/api/mcp-v2`. Production jobs are serialized and are never cancelled by a newer commit.

Initial setup:

1. Create or import the Vercel project with Root Directory `chatgpt-app` and Framework Preset `Other`. No application environment variables are required.
2. Create a GitHub environment named `production`. Add `VERCEL_TOKEN` as an environment secret and add `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `PRODUCTION_URL` as environment variables. `PRODUCTION_URL` must be the stable production origin, for example `https://cards.example.com`, without an endpoint path.
3. Leave Git integration available for pull-request previews if desired. `vercel.json` disables Git-triggered deployments for `main`, because GitHub Actions is the sole Production deployer.
4. Protect `main` and require the `Verify both review-card surfaces` check before merging.

Before each release, the workflow records the current READY Production deployment and its reported version. After deployment it retries the full health-contract check up to five times, then retries the MCP smoke test up to five times. If either post-deployment check fails, the workflow rolls back to the recorded deployment, verifies that the old version is live again, and remains failed so the incident is visible. The Actions summary records the commit SHA, deployment URL, new deployment ID, and previous deployment ID.

The automatic path requires an existing healthy Production deployment so that every release has a rollback target. Bootstrap the first deployment manually with Vercel, confirm its health endpoint, and then enable the GitHub workflow.

For manual verification, run:

```bash
npm run verify:deployment -- https://YOUR_DOMAIN
npm run smoke -- https://YOUR_DOMAIN/api/mcp-v2
```

The smoke check initializes MCP, checks the tool schema, lists and reads the current and previous resources, then verifies one v2 call containing ten questions. Remove any ChatGPT connection that points to the old `/api/mcp`, then create the private remote MCP app with `https://YOUR_DOMAIN/api/mcp-v2`; the new URL forces fresh tool discovery.

Whenever `APP_VERSION` changes, set `PREVIOUS_APP_VERSION` to the version being replaced. The service intentionally supports only the current and immediately previous widget URIs. If the smoke check still reports an old tool or schema, verify the Vercel project, deployed commit, Root Directory, and saved ChatGPT MCP URL instead of changing quiz business logic again.

The MCP endpoint has no application-level authentication. Keep the connector private in ChatGPT and use a hard-to-guess deployment URL for the prototype. Add OAuth before sharing the endpoint with other users.
