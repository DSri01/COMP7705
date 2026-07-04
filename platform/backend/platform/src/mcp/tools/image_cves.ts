import { NotFoundException } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PlatformMcpToolContext } from "../context.js";
import {
  getImageCve,
  listDisabledImageCves,
  listImageCves,
  serializeImageCveDetail,
  serializeImageCveListPayload,
} from "../../platform-read-tools/read/image-cves.js";
import {
  GetImageCveInputSchema,
  ImageCveListInputSchema,
  type GetImageCveInput,
  type ImageCveListInput,
} from "../../platform-read-tools/schemas/image-cve-scope.js";

/** Exported for unit tests (same logic as HTTP GET .../image-cves). */
export async function listImageCvesToolHandler(
  ctx: PlatformMcpToolContext,
  args: ImageCveListInput,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const payload = await listImageCves(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeImageCveListPayload(payload),
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

/** Exported for unit tests (same logic as HTTP GET .../image-cves/disabled). */
export async function listDisabledImageCvesToolHandler(
  ctx: PlatformMcpToolContext,
  args: ImageCveListInput,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const payload = await listDisabledImageCves(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeImageCveListPayload(payload),
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

/** Exported for unit tests (same logic as HTTP GET .../image-cves/{imageCveId}). */
export async function getImageCveToolHandler(
  ctx: PlatformMcpToolContext,
  args: GetImageCveInput,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const payload = await getImageCve(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeImageCveDetail(payload),
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

export function registerImageCveMcpTools(server: McpServer, ctx: PlatformMcpToolContext): void {
  server.registerTool(
    "list_image_cves",
    {
      description:
        "List CVE associations for the component's current container image (latest chain entry): returns `{ imageCves }` with compact triage fields per row (ids, severity, intel highlights, VEX status, disable state). Includes both enabled and disabled rows on that image. Matches GET /projects/{projectId}/components/{componentId}/image-cves. For full decision/advice on one row, use get_image_cve.",
      inputSchema: ImageCveListInputSchema,
    },
    async (args) => listImageCvesToolHandler(ctx, args),
  );

  server.registerTool(
    "list_disabled_image_cves",
    {
      description:
        "List disabled CVE associations only for the component's current container image (latest chain entry): same `{ imageCves }` shape as list_image_cves but filtered to disabled rows (disableState.state === disabled). Matches GET /projects/{projectId}/components/{componentId}/image-cves/disabled. For full decision/advice on one row, use get_image_cve.",
      inputSchema: ImageCveListInputSchema,
    },
    async (args) => listDisabledImageCvesToolHandler(ctx, args),
  );

  server.registerTool(
    "get_image_cve",
    {
      description:
        "Get one image-CVE association for the component's current container image: full detail including `decision` and `advice` (`ImageCveDetail`), matching GET /projects/{projectId}/components/{componentId}/image-cves/{imageCveId}. Use list_image_cves / list_disabled_image_cves for compact rows and imageCveId.",
      inputSchema: GetImageCveInputSchema,
    },
    async (args) => getImageCveToolHandler(ctx, args),
  );
}
