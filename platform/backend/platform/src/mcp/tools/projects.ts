import { NotFoundException } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PlatformMcpToolContext } from "../context.js";
import { getProject, serializeProject } from "../../platform-read-tools/read/get-project.js";
import {
  getProjectImageCveStats,
  serializeProjectImageCveStats,
} from "../../platform-read-tools/read/get-project-image-cve-stats.js";
import { listProjectsJson } from "../../platform-read-tools/read/list-projects.js";

/** Exported for unit tests (MCP wrapper over {@link listProjectsJson}). */
export async function listProjectsToolHandler(ctx: PlatformMcpToolContext): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const text = await listProjectsJson(ctx);
  return {
    content: [{ type: "text" as const, text }],
  };
}

const projectIdInputSchema = z.object({
  projectId: z.uuid(),
});

/** Exported for unit tests (same logic as HTTP GET /projects/:id). */
export async function getProjectToolHandler(
  ctx: PlatformMcpToolContext,
  args: z.infer<typeof projectIdInputSchema>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const project = await getProject(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeProject(project),
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

/** Exported for unit tests (same logic as HTTP GET /projects/:id/stats). */
export async function getProjectImageCveStatsToolHandler(
  ctx: PlatformMcpToolContext,
  args: z.infer<typeof projectIdInputSchema>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const stats = await getProjectImageCveStats(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeProjectImageCveStats(stats),
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

export { projectToResponsePayload } from "../../platform-read-tools/read/get-project.js";

export function registerProjectMcpTools(server: McpServer, ctx: PlatformMcpToolContext): void {
  server.registerTool(
    "list_projects",
    {
      description:
        "List projects with id, name, and timestamp fields (createdAtUnixSeconds, updatedAtUnixSeconds as string decimals). Project description is omitted here because it can be large; use the get_project tool to fetch the full project record including description.",
      inputSchema: z.object({}),
    },
    async () => listProjectsToolHandler(ctx),
  );

  server.registerTool(
    "get_project",
    {
      description:
        "Get one project by UUID: id, name, description, createdAtUnixSeconds, updatedAtUnixSeconds (string decimals), matching GET /projects/{id}.",
      inputSchema: projectIdInputSchema,
    },
    async (args) => getProjectToolHandler(ctx, args),
  );

  server.registerTool(
    "get_project_image_cve_stats",
    {
      description:
        "Aggregated enabled image-CVE counts for the project: latest image per component only, vex_status - severity (ImageCveStatsResponseDto), matching GET /projects/{id}/stats.",
      inputSchema: projectIdInputSchema,
    },
    async (args) => getProjectImageCveStatsToolHandler(ctx, args),
  );
}
