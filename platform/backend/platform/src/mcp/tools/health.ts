import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCurrentTimeUnixSeconds } from "../../utils/time.js";
import type { PlatformMcpToolContext } from "../context.js";

/** Exported for unit tests. */
export async function healthToolHandler(ctx: PlatformMcpToolContext): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            server: "ok",
            readOnly: true,
            dbInitialized: ctx.dataSource.isInitialized,
            timeUnixSeconds: getCurrentTimeUnixSeconds().toString(),
          },
          null,
          2,
        ),
      },
    ],
  };
}

export function registerHealthMcpTools(server: McpServer, ctx: PlatformMcpToolContext): void {
  server.registerTool(
    "health",
    {
      description: "Returns MCP server health and database connectivity status",
      inputSchema: z.object({}),
    },
    async () => healthToolHandler(ctx),
  );
}
