import app from "./app.js";

const port = Number(process.env.PORT || 8787);
app.listen(port, "0.0.0.0", (error) => {
  if (error) {
    console.error("Unable to start MCP server", error);
    process.exitCode = 1;
    return;
  }
  console.log(`English review MCP server listening on http://0.0.0.0:${port}/mcp`);
});
