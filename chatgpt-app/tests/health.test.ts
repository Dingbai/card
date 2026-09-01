import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import {
  APP_VERSION,
  CURRENT_MCP_ENDPOINT,
  COMPATIBLE_RESOURCE_URIS,
  CURRENT_RESOURCE_URI,
  TOOL_NAME,
} from "../src/config.js";
import { healthHandler } from "../src/health.js";

test("health endpoint identifies the deployed tool and resource compatibility window", async () => {
  let body: unknown;
  const response = { json(value: unknown) { body = value; } } as Response;
  healthHandler({} as Request, response);
  assert.deepEqual(body, {
    ok: true,
    version: APP_VERSION,
    tool: TOOL_NAME,
    endpoint: CURRENT_MCP_ENDPOINT,
    resource: CURRENT_RESOURCE_URI,
    compatibleResources: COMPATIBLE_RESOURCE_URIS,
  });
});
