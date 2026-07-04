import { NotFoundException } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PlatformMcpToolContext } from "../context.js";
import { getComponent, serializeComponent } from "../../platform-read-tools/read/get-component.js";
import {
  getComponentImageCveStats,
  serializeComponentImageCveStats,
} from "../../platform-read-tools/read/get-component-image-cve-stats.js";
import { getOpenVex, serializeOpenVex } from "../../platform-read-tools/read/get-openvex.js";
import { listComponents, serializeComponentsList } from "../../platform-read-tools/read/list-components.js";

const listComponentsInputSchema = z.object({
  projectId: z.uuid(),
});

const getComponentInputSchema = z.object({
  projectId: z.uuid(),
  componentId: z.uuid(),
});

/** Exported for unit tests. Omits `description` (use `get_component` for full record). */
export async function listComponentsToolHandler(
  ctx: PlatformMcpToolContext,
  args: z.infer<typeof listComponentsInputSchema>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const components = await listComponents(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeComponentsList(components),
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

/** Exported for unit tests (same logic as HTTP GET /projects/:projectId/components/:componentId). */
export async function getComponentToolHandler(
  ctx: PlatformMcpToolContext,
  args: z.infer<typeof getComponentInputSchema>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const component = await getComponent(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeComponent(component),
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

/** Exported for unit tests (same logic as HTTP GET .../components/:componentId/vex). */
export async function getOpenVexToolHandler(
  ctx: PlatformMcpToolContext,
  args: z.infer<typeof getComponentInputSchema>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const doc = await getOpenVex(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeOpenVex(doc),
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

/** Exported for unit tests (same logic as HTTP GET .../components/:componentId/stats). */
export async function getComponentImageCveStatsToolHandler(
  ctx: PlatformMcpToolContext,
  args: z.infer<typeof getComponentInputSchema>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const stats = await getComponentImageCveStats(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeComponentImageCveStats(stats),
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

export {
  componentToListSummaryPayload,
  componentsToListSummaryPayload,
} from "../../platform-read-tools/read/list-components.js";
export { componentToResponsePayload } from "../../platform-read-tools/read/get-component.js";

export function registerComponentMcpTools(server: McpServer, ctx: PlatformMcpToolContext): void {
  server.registerTool(
    "list_components",
    {
      description:
        "List components in a project: id, projectId, name, and timestamp fields (createdAtUnixSeconds, updatedAtUnixSeconds as string decimals). Component description is omitted because it can be large; use the get_component tool for the full record including description.",
      inputSchema: listComponentsInputSchema,
    },
    async (args) => listComponentsToolHandler(ctx, args),
  );

  server.registerTool(
    "get_component",
    {
      description:
        "Get one component by project UUID and component UUID: id, projectId, name, description, createdAtUnixSeconds, updatedAtUnixSeconds (string decimals), matching GET /projects/{projectId}/components/{componentId}.",
      inputSchema: getComponentInputSchema,
    },
    async (args) => getComponentToolHandler(ctx, args),
  );

  server.registerTool(
    "get_openvex",
    {
      description:
        "Export OpenVEX v0.2.0 JSON for the component's latest container image (enabled CVE statements). Matches GET /projects/{projectId}/components/{componentId}/vex.",
      inputSchema: getComponentInputSchema,
    },
    async (args) => getOpenVexToolHandler(ctx, args),
  );

  server.registerTool(
    "get_component_image_cve_stats",
    {
      description:
        "Roll-up stats for enabled image-CVEs on the component's latest image (vexStatus - severity). Matches GET /projects/{projectId}/components/{componentId}/stats (same shape as get_project_image_cve_stats for one component).",
      inputSchema: getComponentInputSchema,
    },
    async (args) => getComponentImageCveStatsToolHandler(ctx, args),
  );
}
