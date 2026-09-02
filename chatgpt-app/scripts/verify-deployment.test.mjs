import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBaseUrl,
  validateHealth,
  verifyDeployment,
} from "./verify-deployment.mjs";

const version = "0.8.0";
const validHealth = {
  ok: true,
  version,
  tool: "create_english_review_card_v2",
  endpoint: "/api/mcp-v2",
  resource: `ui://widget/english-review-card-v${version}.html`,
  compatibleResources: [
    `ui://widget/english-review-card-v${version}.html`,
    "ui://widget/english-review-card-v0.7.0.html",
  ],
};

test("normalizes a deployment base URL", () => {
  assert.equal(normalizeBaseUrl("https://cards.example.com/"), "https://cards.example.com");
  assert.throws(() => normalizeBaseUrl("ftp://cards.example.com"), /http or https/);
});

test("validates the complete deployed health contract", () => {
  assert.doesNotThrow(() => validateHealth(validHealth, version));
  assert.throws(
    () => validateHealth({ ...validHealth, version: "0.7.0" }, version),
    /version does not match/,
  );
  assert.throws(
    () => validateHealth({ ...validHealth, compatibleResources: [] }, version),
    /compatible resources/,
  );
});

test("retries transient failures and returns the successful attempt", async () => {
  let calls = 0;
  const result = await verifyDeployment({
    baseUrl: "https://cards.example.com",
    expectedVersion: version,
    attempts: 3,
    delayMs: 0,
    wait: async () => {},
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) throw new Error("not ready");
      return { ok: true, json: async () => validHealth };
    },
  });

  assert.equal(result.attempt, 3);
  assert.equal(calls, 3);
});

test("fails after the configured number of attempts", async () => {
  let calls = 0;
  await assert.rejects(
    verifyDeployment({
      baseUrl: "https://cards.example.com",
      expectedVersion: version,
      attempts: 2,
      delayMs: 0,
      wait: async () => {},
      fetchImpl: async () => {
        calls += 1;
        return { ok: false, status: 503 };
      },
    }),
    /failed after 2 attempts/,
  );
  assert.equal(calls, 2);
});
