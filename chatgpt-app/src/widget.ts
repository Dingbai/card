import { readFileSync } from "node:fs";
import { join } from "node:path";

export const widgetHtml = readFileSync(join(process.cwd(), "public", "widget.html"), "utf8");
