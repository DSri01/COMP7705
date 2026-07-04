import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PlatformMcpToolContext } from "../context.js";
import { registerComponentMcpTools } from "./components.js";
import { registerContainerImageMcpTools } from "./container_images.js";
import { registerCveMcpTools } from "./cves.js";
import { registerCveResearchDocumentMcpTools } from "./cve_research_documents.js";
import { registerHealthMcpTools } from "./health.js";
import { registerImageCveMcpTools } from "./image_cves.js";
import { registerProjectMcpTools } from "./projects.js";

export function registerAllPlatformMcpTools(server: McpServer, ctx: PlatformMcpToolContext): void {
  registerHealthMcpTools(server, ctx);
  registerProjectMcpTools(server, ctx);
  registerComponentMcpTools(server, ctx);
  registerContainerImageMcpTools(server, ctx);
  registerImageCveMcpTools(server, ctx);
  registerCveMcpTools(server, ctx);
  registerCveResearchDocumentMcpTools(server, ctx);
}
