import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.argv[2];
if (!endpoint) {
  console.error("Usage: npm run smoke -- https://YOUR_DOMAIN/api/mcp");
  process.exitCode = 2;
} else {
  const client = new Client({ name: "english-review-card-smoke", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const tool = tools.tools.find((candidate) => candidate.name === "create_english_review_card_v2");
    if (!tool) throw new Error("create_english_review_card_v2 is not exposed");
    if ("maxItems" in (tool.inputSchema.properties?.questions ?? {})) {
      throw new Error("The deployed questions schema still has maxItems");
    }

    const resources = await client.listResources();
    if (resources.resources.length !== 2) {
      throw new Error(`Expected two compatible widget resources, received ${resources.resources.length}`);
    }
    for (const resource of resources.resources) {
      const read = await client.readResource({ uri: resource.uri });
      if (!read.contents.length) throw new Error(`Resource ${resource.uri} returned no content`);
    }

    const quiz = {
      title: "Deployment smoke review",
      source_summary: "Synthetic deployment-check data; not shown to a learner",
      questions: Array.from({ length: 10 }, (_, index) => ({
        id: `smoke-${index + 1}`,
        type: "fill_in",
        knowledge_point: "deployment check",
        prompt: `Deployment check ${index + 1}: type answer ${index + 1}`,
        accepted_answers: [`answer ${index + 1}`],
        explanation_en: "This synthetic item verifies the deployed MCP contract.",
        explanation_zh: "这道合成题用于验证已部署的 MCP 契约。",
      })),
    };
    const result = await client.callTool({ name: tool.name, arguments: quiz });
    if (result.isError || result.structuredContent?.questions?.length !== 10) {
      throw new Error("The deployed tool did not return all ten questions");
    }
    console.log(JSON.stringify({
      ok: true,
      endpoint,
      tool: tool.name,
      resources: resources.resources.map((resource) => resource.uri),
      questions: result.structuredContent.questions.length,
    }, null, 2));
  } finally {
    await client.close();
  }
}
