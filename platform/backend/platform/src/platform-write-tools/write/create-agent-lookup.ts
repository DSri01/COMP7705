import type { CveResearchDocument } from '../../db/entities/cve_research_documents/definition.js';
import { cveResearchDocumentToListSummaryPayload } from '../../platform-read-tools/read/cve-research-documents.js';
import type { PlatformWriteToolContext } from '../context.js';

export type CreateAgentLookupInput = {
    cveId: string;
    title: string;
    content: string;
    createdAtUnixSeconds: bigint;
};

/** Persists an `agent_lookup` research document from a web fetch. */
export async function createAgentLookup(
    ctx: PlatformWriteToolContext,
    args: CreateAgentLookupInput,
): Promise<CveResearchDocument> {
    return ctx.cveResearchDocumentsService.createAgentLookup(args.cveId, {
        title: args.title,
        content: args.content,
        createdAtUnixSeconds: args.createdAtUnixSeconds,
    });
}

export function agentLookupCreateToResponsePayload(doc: CveResearchDocument) {
    return {
        ok: true as const,
        ...cveResearchDocumentToListSummaryPayload(doc),
        readWith: 'get_cve_research_document' as const,
        documentId: doc.id,
    };
}

export function serializeAgentLookupCreate(doc: CveResearchDocument): string {
    return JSON.stringify(agentLookupCreateToResponsePayload(doc), null, 2);
}
