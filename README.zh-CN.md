# 英语复习卡片

简体中文 | [English](README.md)

英语复习卡片会把英语学习对话中实际讲解或练习过的内容，转化为可交互、带双语解析的复习测验。本仓库通过两套相互独立的交付面提供同一种体验：

- **本地 Codex Skill**（`english-review-card/`）：在 Codex 中生成自包含的复习卡片，并在本地保存最小化的日期学习摘要。
- **ChatGPT MCP App**（`chatgpt-app/`）：提供远程 MCP 工具和 Apps SDK 交互组件，可连接到 ChatGPT 使用。

两套实现遵循相同的产品规则和题目契约，但运行时互不依赖。

## 主要功能

- 只根据当前对话中实际学习过的词汇、语法、表达和阅读知识生成题目。
- 默认生成 5 道混合题，支持任意正整数题量，以及选择题、填空题和简答题。
- 提供双语解析、成绩统计、错题复练和追加练习。
- 填空题与简答题支持拼写容错；无法确定的简答题可交回当前对话模型进行语义复核。
- ChatGPT 组件可以恢复卡片和答题进度，但服务端不持久化学习者答案。
- 本地 Codex Skill 可根据最小化的日期摘要复习最近若干自然日的内容。

## 目录结构

```text
.
├── english-review-card/   # 本地 Codex Skill、Python 渲染器、数据契约与测试
├── chatgpt-app/           # TypeScript MCP 服务、Apps SDK 组件与测试
├── docs/harness/          # 跨实现的角色、约束与 QA 工作流
├── scripts/               # 持久化任务台账工具
├── tests/                 # 仓库级工具测试
└── .github/workflows/     # CI 与 Vercel 生产部署
```

## 环境要求

- 本地渲染器和仓库工具：Python 3.9 或更高版本
- ChatGPT App：Node.js 20 或更高版本
- 使用 npm 和 `npm ci` 安装可复现的应用依赖

## 快速开始

### 本地 Codex Skill

将 `english-review-card/` 安装或链接为 Codex Skill。完成一次英语学习对话后，明确说“done”“学完了”或“开始复习”等指令，Skill 会根据对话生成题目 JSON，并渲染成交互式 HTML 卡片。

验证本地实现：

```bash
python3 -m unittest discover -s english-review-card/tests -v
```

本地 Skill 可能将最小化的日期摘要写入 `.english-review-card/history.jsonl`，但不会保存原始对话、完整答案、答题进度或答题历史。

### ChatGPT MCP App

```bash
cd chatgpt-app
npm ci
npm test
npm start
```

本地端点：

- MCP：`http://localhost:8787/mcp`
- 健康检查：`http://localhost:8787/health`

服务端不需要 OpenAI API Key。私有 Vercel 部署、生产验证、失败回滚和 ChatGPT 连接方法详见 [`chatgpt-app/README.md`](chatgpt-app/README.md)。

## 开发与验证

题目契约有意同时存在于数据规范、Python 渲染器和 TypeScript 应用中。修改共享行为时，需要同步检查所有受影响的生产者和消费者；生成或编译产物不是源码。

在仓库根目录运行完整的本地验证：

```bash
python3 -m unittest discover -s english-review-card/tests -v
python3 -m unittest discover -s tests -v
cd chatgpt-app
npm ci
npm run check
npm test
```

相关文档：

- [`english-review-card/SKILL.md`](english-review-card/SKILL.md) — 本地 Skill 的行为与工作流
- [`english-review-card/references/question-schema.md`](english-review-card/references/question-schema.md) — 题目数据结构
- [`english-review-card/references/study-summary-schema.md`](english-review-card/references/study-summary-schema.md) — 本地学习摘要格式
- [`docs/harness/review-card/team-spec.md`](docs/harness/review-card/team-spec.md) — 跨实现的职责与验证矩阵

请勿编辑 `chatgpt-app/dist/`，它是编译产物。

## 部署

ChatGPT App 适合私有部署到 Vercel，并将 `chatgpt-app` 配置为 Vercel Root Directory。新的 ChatGPT 连接使用 `/api/mcp-v2`；`/api/mcp` 继续作为兼容端点保留。

GitHub Actions 会在生产部署前测试两套实现。部署后会验证健康检查与 MCP 契约；如果验证失败，工作流会回滚到上一个健康部署。首次健康的生产部署需要手动完成，以便为后续自动部署提供回滚目标。

## 隐私与安全

- MCP 服务端不持久化答题结果，也不需要 OpenAI API Key。
- 本地 Skill 仅保存用于近期复习的结构化摘要、知识点和错误记录。
- MCP 端点目前没有应用层身份认证。原型部署应保持私有；向其他用户开放前需要增加 OAuth。

## 许可证

仓库目前未包含许可证文件。在添加许可证之前，所有权利归仓库所有者保留。
