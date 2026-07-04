import { BadRequestException, NotFoundException } from "@nestjs/common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PlatformMcpToolContext } from "../context.js";
import {
  cveResearchDocumentToListSummaryPayload,
  cveResearchDocumentToResponsePayload,
  getCveResearchDocument,
  listCveResearchDocuments,
  serializeCveResearchDocument,
  serializeCveResearchDocumentList,
} from "../../platform-read-tools/read/cve-research-documents.js";
import {
  GetCveResearchDocumentInputSchema,
  ListCveResearchDocumentsInputSchema,
  type GetCveResearchDocumentInput,
  type ListCveResearchDocumentsInput,
} from "../../platform-read-tools/schemas/cve-research-document-scope.js";

export {
  cveResearchDocumentToListSummaryPayload,
  cveResearchDocumentToResponsePayload,
} from "../../platform-read-tools/read/cve-research-documents.js";

/** Exported for unit tests. */
export async function listCveResearchDocumentsToolHandler(
  ctx: PlatformMcpToolContext,
  args: ListCveResearchDocumentsInput,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const rows = await listCveResearchDocuments(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeCveResearchDocumentList(rows),
        },
      ],
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

/** Exported for unit tests (same logic as HTTP GET .../research-documents/{documentId}). */
export async function getCveResearchDocumentToolHandler(
  ctx: PlatformMcpToolContext,
  args: GetCveResearchDocumentInput,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    const doc = await getCveResearchDocument(ctx, args);
    return {
      content: [
        {
          type: "text" as const,
          text: serializeCveResearchDocument(doc),
        },
      ],
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

export function registerCveResearchDocumentMcpTools(
  server: McpServer,
  ctx: PlatformMcpToolContext,
): void {
  server.registerTool(
    "list_cve_research_documents",
    {
      description:
        "List research documents for a CVE as a JSON array of summaries: id, cveId, source, title, createdAtUnixSeconds (string). Body text (`content`) is omitted because it can be large; use get_cve_research_document for the full document. Same underlying query as GET /cves/{cveId}/research-documents.",
      inputSchema: ListCveResearchDocumentsInputSchema,
    },
    async (args) => listCveResearchDocumentsToolHandler(ctx, args),
  );

  server.registerTool(
    "get_cve_research_document",
    {
      description:
        "Get one research document by CVE id and document UUID: full body (`content`) plus metadata, matching GET /cves/{cveId}/research-documents/{documentId}. Document ids come from list_cve_research_documents.",
      inputSchema: GetCveResearchDocumentInputSchema,
    },
    async (args) => getCveResearchDocumentToolHandler(ctx, args),
  );
}
