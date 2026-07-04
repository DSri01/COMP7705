import { BadRequestException, NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { getCve } from '../../../platform-read-tools/read/get-cve.js';
import {
    agentLookupCreateToResponsePayload,
    createAgentLookup,
    serializeAgentLookupCreate,
} from '../../../platform-write-tools/write/create-agent-lookup.js';
import { PLATFORM_ASSISTANT_TURN_TOOL_LIMITS } from '../../agent-graphs/platform-assistant/turn-budget.js';
import type { TurnToolBudgetDeps } from '../../lib/turn-budget/index.js';
import { fetchAndParseWebPage } from '../../../web/fetch-and-parse.js';
import type { PlatformDbToolContext } from '../db/context.js';
import { CveIdSchema } from '../db/schemas/cve-id.js';

const WebFetchUrlMarkdownInputSchema = z.object({
    url: z.string().min(1).describe('HTTPS page URL to fetch and convert to markdown'),
    cveId: CveIdSchema,
});

export type WebFetchUrlMarkdownInput = z.infer<typeof WebFetchUrlMarkdownInputSchema>;

export type WebFetchUrlMarkdownDeps = {
    fetchAndParseWebPage?: typeof fetchAndParseWebPage;
} & Partial<TurnToolBudgetDeps>;

export { agentLookupCreateToResponsePayload };

/**
 * Fetches `url`, persists an `agent_lookup` snapshot for `cveId`, returns document metadata (not body).
 * CVE must exist before fetch.
 */
export async function webFetchUrlMarkdownHandler(
    ctx: PlatformDbToolContext,
    args: WebFetchUrlMarkdownInput,
    deps: WebFetchUrlMarkdownDeps = {},
): Promise<string> {
    const fetchAndParse = deps.fetchAndParseWebPage ?? fetchAndParseWebPage;

    if (deps.turnBudget && deps.resolveThreadId) {
        const budgetError = deps.turnBudget.tryConsume(
            deps.resolveThreadId(),
            'web_fetch_url_markdown',
        );
        if (budgetError) {
            return budgetError;
        }
    }

    try {
        await getCve(ctx, { cveId: args.cveId });

        const parsed = await fetchAndParse(args.url);
        if (!parsed.ok) {
            return `ERROR: ${parsed.error}`;
        }

        const doc = await createAgentLookup(ctx, {
            cveId: args.cveId,
            title: parsed.title,
            content: parsed.content,
            createdAtUnixSeconds: parsed.fetchedAtUnixSeconds,
        });

        return serializeAgentLookupCreate(doc);
    } catch (e) {
        if (e instanceof NotFoundException || e instanceof BadRequestException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `web_fetch_url_markdown` tool. Platform-assistant only. */
export function createWebFetchUrlMarkdownTool(
    ctx: PlatformDbToolContext,
    deps: WebFetchUrlMarkdownDeps = {},
): StructuredTool<typeof WebFetchUrlMarkdownInputSchema> {
    return tool(async (args) => webFetchUrlMarkdownHandler(ctx, args, deps), {
        name: 'web_fetch_url_markdown',
        description:
            'Fetch an HTTPS page, convert to markdown, and persist as a new agent_lookup research document ' +
            'for the given cveId (always inserts a time-stamped snapshot). ' +
            `Max ${PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_fetch_url_markdown} calls per user request (enforced). ` +
            'Workflow hint: fetch up to ~2 URLs per web_search before searching again. ' +
            'Requires an existing CVE row (use get_cve first if unsure). ' +
            'Returns document id and metadata only (readWith: get_cve_research_document). ' +
            'Next: get_cve_research_document(cveId, documentId, startChar, endChar) — do NOT use ' +
            'get_context_length or read_context_range for fetched docs. Platform-assistant only.',
        schema: WebFetchUrlMarkdownInputSchema,
    });
}
