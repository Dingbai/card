import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const widget = readFileSync(join(process.cwd(), "public", "widget.html"), "utf8");
const appSource = readFileSync(join(process.cwd(), "src", "app.ts"), "utf8");

test("renders all questions in one variable-length card", () => {
  assert.match(widget, /state\.index<quiz\.questions\.length/);
  assert.match(widget, /const total=quiz\.questions\.length/);
  assert.doesNotMatch(widget, /state\.index<5/);
  assert.match(appSource, /Put every requested question in this single call/);
});

test("follow-up explicitly requests a new single card", () => {
  assert.match(widget, /请立即调用 create_english_review_card 工具一次/);
  assert.match(widget, /questions 数组必须包含全部/);
  assert.match(widget, /不要只回复文字/);
});

test("uses a versioned template URI to avoid stale widget caches", () => {
  assert.match(appSource, /APP_VERSION = "0\.5\.0"/);
  assert.match(appSource, /english-review-card-v\$\{APP_VERSION\}\.html/);
  assert.match(appSource, /ui: \{ resourceUri: RESOURCE_URI \}/);
  assert.match(widget, /Daily English Review · v0\.5\.0/);
});

test("persists and restores the quiz and answer progress", () => {
  assert.match(widget, /setWidgetState\(\{\.\.\.previous,quiz,quizId,progress:/);
  assert.match(widget, /widgetState\?\.quiz/);
  assert.match(widget, /saved\?\.quizId===quizId&&saved\.progress/);
  assert.match(widget, /state\.answers\[state\.index\]=result/);
  assert.doesNotMatch(appSource, /ephemeral:\s*true/);
});

test("records server and widget timing diagnostics", () => {
  assert.match(appSource, /console\.info\("mcp_request"/);
  assert.match(appSource, /initMs:/);
  assert.match(appSource, /mcpMs:/);
  assert.match(widget, /english_review_card_ready/);
  assert.match(widget, /widgetBootMs:/);
});

test("submits update requests through the supported follow-up signature", () => {
  assert.match(widget, /sendFollowUpMessage\(\{prompt,scrollToBottom:true\}\)/);
  assert.doesNotMatch(widget, /sendFollowUpMessage\(\{prompt,title:/);
  assert.match(widget, /更新请求已提交到对话，正在等待新卡片/);
  assert.doesNotMatch(widget, /设置已保存并发送/);
});
