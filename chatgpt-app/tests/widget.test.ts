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
  assert.match(widget, /必须再次调用 create_english_review_card/);
  assert.match(widget, /不要拆成多张卡片，也不要只回复文字/);
  assert.match(widget, /生成一张新的英语复习卡片/);
});

test("uses a versioned template URI to avoid stale widget caches", () => {
  assert.match(appSource, /english-review-card-v0\.3\.0\.html/);
  assert.match(appSource, /ui: \{ resourceUri: RESOURCE_URI \}/);
});
