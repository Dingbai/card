import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const widget = readFileSync(join(process.cwd(), "public", "widget.html"), "utf8");
const appSource = readFileSync(join(process.cwd(), "src", "app.ts"), "utf8");
const configSource = readFileSync(join(process.cwd(), "src", "config.ts"), "utf8");

test("renders all questions in one variable-length card", () => {
  assert.match(widget, /state\.index<quiz\.questions\.length/);
  assert.match(widget, /const total=quiz\.questions\.length/);
  assert.doesNotMatch(widget, /state\.index<5/);
  assert.match(appSource, /no maximum count/);
});

test("follow-up explicitly requests a new single card", () => {
  assert.match(widget, /请立即调用 create_english_review_card_v2 工具一次/);
  assert.match(widget, /questions 数组必须包含全部/);
  assert.match(widget, /没有最大题数限制/);
  assert.match(widget, /不要只回复文字/);
});

test("uses a versioned template URI to avoid stale widget caches", () => {
  assert.match(configSource, /APP_VERSION = "0\.7\.0"/);
  assert.match(configSource, /PREVIOUS_APP_VERSION = "0\.6\.0"/);
  assert.match(configSource, /TOOL_NAME = "create_english_review_card_v2"/);
  assert.match(configSource, /english-review-card-v\$\{version\}\.html/);
  assert.match(appSource, /ui: \{ resourceUri: CURRENT_RESOURCE_URI \}/);
  assert.match(widget, /Daily English Review · v0\.7\.0/);
});

test("publishes a versioned MCP endpoint to force fresh tool discovery", () => {
  assert.match(configSource, /CURRENT_MCP_ENDPOINT = "\/api\/mcp-v2"/);
  assert.match(configSource, /COMPATIBLE_MCP_ENDPOINTS = \[CURRENT_MCP_ENDPOINT, "\/api\/mcp", "\/mcp"\]/);
  assert.match(appSource, /COMPATIBLE_MCP_ENDPOINTS/);
  assert.match(appSource, /chatgpt-app-ashy\.vercel\.app\/api\/mcp-v2/);
});

test("persists and restores the quiz and answer progress", () => {
  assert.match(widget, /setWidgetState\(\{\.\.\.previous,quiz,quizId,progress:/);
  assert.match(widget, /widgetState\?\.quiz/);
  assert.match(widget, /saved\?\.quizId===quizId&&saved\.progress/);
  assert.match(widget, /state\.answers\[state\.index\]=result/);
  assert.match(widget, /savedAnswer=state\.answers\[state\.index\]\?\.answer\?\?''/);
  assert.match(widget, /if\(nextId===quizId\)return/);
  assert.doesNotMatch(appSource, /ephemeral:\s*true/);
});

test("records server and widget timing diagnostics", () => {
  assert.match(appSource, /console\.info\("mcp_request"/);
  assert.match(appSource, /initMs:/);
  assert.match(appSource, /mcpMs:/);
  assert.match(widget, /english_review_card_ready/);
  assert.match(widget, /generationMs,source/);
  assert.match(widget, /本卡生成/);
  assert.match(widget, /generationTiming/);
  assert.match(widget, /request_started_at_ms/);
  assert.doesNotMatch(widget, /初次加载/);
  assert.doesNotMatch(widget, /firstTiming/);
});

test("sizes missed-question practice from the number of wrong answers", () => {
  assert.match(widget, /questionCount=missed\.length\|\|prefs\.questionCount/);
  assert.match(widget, /题目数量必须等于本轮 \$\{missed\.length\} 道错题的数量/);
});

test("shows loading placeholders until complete quiz data arrives", () => {
  assert.match(widget, /data-view="loading"/);
  assert.match(widget, /class="skeleton"/);
  assert.match(widget, /candidate\?\.questions\?\.length/);
  assert.match(widget, /aria-busy="true"/);
  assert.match(appSource, /题目就绪前将显示加载占位/);
});

test("locks the settings entry while the settings view is open", () => {
  assert.match(widget, /settingsButton\.disabled=true;settingsButton\.hidden=true/);
  assert.match(widget, /function cancelSettings\(\)/);
  assert.match(widget, /settingsButton\.disabled=false;settingsButton\.hidden=false/);
  assert.match(widget, /if\(action==='cancel-settings'\)cancelSettings\(\)/);
});

test("allows any positive question count with no maximum", () => {
  assert.match(widget, /题目数量（至少 1 题，无上限）/);
  assert.match(widget, /type="number" min="1"/);
  assert.match(widget, /Math\.max\(1,/);
  assert.doesNotMatch(widget, /min="5"/);
});

test("submits update requests through the supported follow-up signature", () => {
  assert.match(widget, /sendFollowUpMessage\(\{prompt,scrollToBottom:true\}\)/);
  assert.doesNotMatch(widget, /sendFollowUpMessage\(\{prompt,title:/);
  assert.match(widget, /更新请求已提交到对话，正在等待新卡片/);
  assert.doesNotMatch(widget, /设置已保存并发送/);
});
