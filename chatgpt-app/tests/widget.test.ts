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
  assert.match(appSource, /never split one card across multiple tool calls/);
});

test("follow-up explicitly requests a new single card", () => {
  assert.match(widget, /请立即调用 create_english_review_card 工具一次/);
  assert.match(widget, /questions 数组必须包含全部/);
  assert.match(widget, /不要只回复文字/);
});

test("uses a versioned template URI to avoid stale widget caches", () => {
  assert.match(appSource, /APP_VERSION = "0\.4\.1"/);
  assert.match(appSource, /english-review-card-v\$\{APP_VERSION\}\.html/);
  assert.match(appSource, /ui: \{ resourceUri: RESOURCE_URI \}/);
  assert.match(widget, /Daily English Review · v0\.4\.1/);
});

test("submits update requests through the supported follow-up signature", () => {
  assert.match(widget, /sendFollowUpMessage\(\{prompt,scrollToBottom:true\}\)/);
  assert.doesNotMatch(widget, /sendFollowUpMessage\(\{prompt,title:/);
  assert.match(widget, /更新请求已提交到对话，正在等待新卡片/);
  assert.doesNotMatch(widget, /设置已保存并发送/);
});
