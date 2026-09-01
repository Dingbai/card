export const APP_VERSION = "0.7.0";
export const PREVIOUS_APP_VERSION = "0.6.0";
export const TOOL_NAME = "create_english_review_card_v2";
export const CURRENT_MCP_ENDPOINT = "/api/mcp-v2";
export const COMPATIBLE_MCP_ENDPOINTS = [CURRENT_MCP_ENDPOINT, "/api/mcp", "/mcp"] as const;

export function resourceUri(version: string) {
  return `ui://widget/english-review-card-v${version}.html`;
}

export const CURRENT_RESOURCE_URI = resourceUri(APP_VERSION);
export const COMPATIBLE_RESOURCE_URIS = [
  CURRENT_RESOURCE_URI,
  resourceUri(PREVIOUS_APP_VERSION),
] as const;

export const healthPayload = {
  ok: true,
  version: APP_VERSION,
  tool: TOOL_NAME,
  endpoint: CURRENT_MCP_ENDPOINT,
  resource: CURRENT_RESOURCE_URI,
  compatibleResources: COMPATIBLE_RESOURCE_URIS,
} as const;
