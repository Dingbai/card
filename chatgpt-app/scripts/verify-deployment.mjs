import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_ATTEMPTS = 5;
const DEFAULT_DELAY_MS = 10_000;
const TOOL_NAME = "create_english_review_card_v2";

export function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Deployment URL must use http or https");
  }
  return url.toString().replace(/\/$/, "");
}

export function validateHealth(payload, expectedVersion) {
  assert.equal(payload?.ok, true, "health payload must report ok: true");
  assert.equal(payload?.version, expectedVersion, "deployed app version does not match");
  assert.equal(payload?.tool, TOOL_NAME, "deployed tool name does not match");
  assert.equal(payload?.endpoint, "/api/mcp-v2", "current MCP endpoint does not match");

  const expectedResource = `ui://widget/english-review-card-v${expectedVersion}.html`;
  assert.equal(payload?.resource, expectedResource, "current widget resource does not match");
  assert.ok(
    Array.isArray(payload?.compatibleResources)
      && payload.compatibleResources.includes(expectedResource),
    "compatible resources must include the current widget resource",
  );
}

export async function verifyDeployment({
  baseUrl,
  expectedVersion,
  attempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS,
  fetchImpl = fetch,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const healthUrl = `${normalizeBaseUrl(baseUrl)}/api/health`;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(healthUrl, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`health endpoint returned HTTP ${response.status}`);
      const payload = await response.json();
      validateHealth(payload, expectedVersion);
      return { healthUrl, payload, attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(delayMs);
    }
  }

  throw new Error(`deployment health check failed after ${attempts} attempts`, { cause: lastError });
}

function parseArguments(argv) {
  const [baseUrl, flag, overrideVersion, ...rest] = argv;
  if (!baseUrl || rest.length > 0 || (flag && flag !== "--expected-version") || (flag && !overrideVersion)) {
    throw new Error("Usage: npm run verify:deployment -- BASE_URL [--expected-version VERSION]");
  }
  return { baseUrl, overrideVersion };
}

async function main() {
  const { baseUrl, overrideVersion } = parseArguments(process.argv.slice(2));
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const expectedVersion = overrideVersion ?? packageJson.version;
  const result = await verifyDeployment({ baseUrl, expectedVersion });
  console.log(JSON.stringify({
    ok: true,
    healthUrl: result.healthUrl,
    version: result.payload.version,
    tool: result.payload.tool,
    resource: result.payload.resource,
    attempts: result.attempt,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
