import { BadRequestException, NotFoundException } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PlatformMcpToolContext } from "../context.js";
import { getCve, serializeCve } from "../../platform-read-tools/read/get-cve.js";
import { CveIdSchema } from "../../platform-read-tools/schemas/cve-id.js";

const getCveInputSchema = z.object({
  cveId: CveIdSchema,
});

/** Exported for unit tests (MCP wrapper over {@link getCve}). */
export async function getCveToolHandler(
  ctx: PlatformMcpToolContext,
  args: z.infer<typeof getCveInputSchema>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const cve = await getCve(ctx, args);
    return {
      content: [{ type: "text", text: serializeCve(cve) }],
    };
  } catch (e) {
    if (e instanceof NotFoundException || e instanceof BadRequestException) {
      return {
        content: [{ type: "text", text: e.message }],
        isError: true,
      };
    }
    throw e;
  }
}

export { cveToResponsePayload } from "../../platform-read-tools/read/get-cve.js";

export function registerCveMcpTools(server: McpServer, ctx: PlatformMcpToolContext): void {
  server.registerTool(
    "get_cve",
    {
      description:
        "Get global CVE record by id (severity, intel highlights, intel timestamps, research summary): matches GET /cves/{cveId}. Use `cveId` from list_image_cves or other tools when known.",
      inputSchema: getCveInputSchema,
    },
    async (args) => getCveToolHandler(ctx, args),
  );
}
