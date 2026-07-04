import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { PLATFORM_ASSISTANT_TURN_TOOL_LIMITS } from '../../agent-graphs/platform-assistant/turn-budget.js';
import type { TurnToolBudgetDeps } from '../../lib/turn-budget/index.js';
import type { WebSearchHit, WebSearchProvider } from '../../../web/search/types.js';

const WebSearchInputSchema = z.object({
    query: z
        .string()
        .min(1)
        .describe('Natural-language search query (no cveId — search does not touch the database).'),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

export type WebSearchDeps = {
    provider: WebSearchProvider;
} & Partial<TurnToolBudgetDeps>;

export function webSearchHitsToResponsePayload(hits: WebSearchHit[]): { ok: true; hits: WebSearchHit[] } {
    return { ok: true, hits };
}

/** Runs configured search provider; returns JSON hits or `ERROR: …`. */
export async function webSearchHandler(
    query: string,
    deps: WebSearchDeps,
): Promise<string> {
    if (deps.turnBudget && deps.resolveThreadId) {
        const budgetError = deps.turnBudget.tryConsume(deps.resolveThreadId(), 'web_search');
        if (budgetError) {
            return budgetError;
        }
    }

    const result = await deps.provider.search(query);
    if (!result.ok) {
        return `ERROR: ${result.error}`;
    }
    return JSON.stringify(webSearchHitsToResponsePayload(result.hits));
}

/** LangChain `web_search` tool. Platform-assistant only. */
export function createWebSearchTool(
    deps: WebSearchDeps,
): StructuredTool<typeof WebSearchInputSchema> {
    return tool(async (args) => webSearchHandler(args.query, deps), {
        name: 'web_search',
        description:
            'Search the web for candidate URLs (no database writes). ' +
            'Returns { ok, hits: [{ url, additionalData }] } — additionalData may include title, snippet, rank. ' +
            `Max ${PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_search} calls per user request (enforced). ` +
            'Workflow hint: ~2 web_fetch_url_markdown calls per search before searching again. ' +
            'To persist page content for a CVE, call web_fetch_url_markdown(url, cveId) separately. ' +
            'Platform-assistant only.',
        schema: WebSearchInputSchema,
    });
}
