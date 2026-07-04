import { NotFoundException } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PlatformMcpToolContext } from "../context.js";
import { getCurrentImage, serializeContainerImage } from "../../platform-read-tools/read/get-current-image.js";

const getCurrentImageInputSchema = z.object({
  projectId: z.uuid(),
  componentId: z.uuid(),
});

/** Exported for unit tests (same logic as HTTP GET .../images/current). */
export async function getCurrentImageToolHandler(
  ctx: PlatformMcpToolContext,
  args: z.infer<typeof getCurrentImageInputSchema>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const image = await getCurrentImage(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeContainerImage(image),
        },
      ],
    };
  } catch (e) {
    if (e instanceof NotFoundException) {
      return {
        content: [{ type: "text", text: e.message }],
        isError: true,
      };
    }
    throw e;
  }
}

export { containerImageToResponsePayload } from "../../platform-read-tools/read/get-current-image.js";

export function registerContainerImageMcpTools(server: McpServer, ctx: PlatformMcpToolContext): void {
  server.registerTool(
    "get_current_image",
    {
      description:
        "Get the current container image for a component (highest chainIndex): id, componentId, stored file and upload fields, scan timestamps, matching GET /projects/{projectId}/components/{componentId}/images/current.",
      inputSchema: getCurrentImageInputSchema,
    },
    async (args) => getCurrentImageToolHandler(ctx, args),
  );
}
