import { randomUUID } from 'node:crypto';

import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import type { SummaryGenerationAgent } from '../../agent-graphs/summary-generation-agent/definition.js';
import type { SummaryGenerationTurnBudget } from '../../agent-graphs/summary-generation-agent/turn-budget.js';
import type { AgentContextManager } from '../../lib/context/manager.js';
import type { PlatformDbToolContext } from '../db/context.js';
import { getCveDbHandler } from '../db/read/get-cve.js';
import { CveIdSchema } from '../db/schemas/cve-id.js';

const ADDITIONAL_CONTEXT_MAX_CHARS = 8192;

const CallSummaryGenerationSchema = z.object({
    cveId: CveIdSchema,
    additionalContext: z
        .string()
        .max(ADDITIONAL_CONTEXT_MAX_CHARS)
        .optional()
        .describe(
            'Optional operator narrative (user goals, constraints, deployment notes). ' +
                'Max 8192 chars; omit or leave empty if unused. Does not override DB facts.',
        ),
});

export type SummaryGenerationInvocationDeps = {
    contextManager: AgentContextManager;
    turnBudget: SummaryGenerationTurnBudget;
};

/**
 * Wraps the summary-generation graph as `call_summary_generation_agent` on platform-assistant.
 *
 * Each invocation uses a fresh inner `thread_id` and separate context/budget scope.
 * Tool name: `call_summary_generation_agent`.
 */
export function createCallSummaryGenerationTool(
    summaryGenerationAgent: SummaryGenerationAgent,
    dbTools: PlatformDbToolContext,
    invocationDeps: SummaryGenerationInvocationDeps,
): StructuredTool<typeof CallSummaryGenerationSchema> {
    const { contextManager, turnBudget } = invocationDeps;

    return tool(
        async ({ cveId, additionalContext }) => {
            const cveCheck = await getCveDbHandler(dbTools, { cveId });
            if (cveCheck.startsWith('ERROR:')) {
                return cveCheck;
            }

            const innerThreadId = `summary-generation-${randomUUID()}`;
            contextManager.beginTurn(innerThreadId);
            turnBudget.beginTurn(innerThreadId);

            try {
                const result = await summaryGenerationAgent.invoke(
                    {
                        cveId,
                        additionalContext: additionalContext?.trim() ?? '',
                        toolMessages: [],
                    },
                    {
                        recursionLimit: 50,
                        configurable: { thread_id: innerThreadId },
                    },
                );
                return result.finalAnswer ?? 'ERROR: summary generation did not produce a draft.';
            } finally {
                turnBudget.endTurn(innerThreadId);
            }
        },
        {
            name: 'call_summary_generation_agent',
            description:
                'Generate a CVE research summary draft. Required when: get_cve.researchSummary is empty and user asked for a ' +
                'CVE summary; user asks to update, refresh, regenerate, overwrite, or save the research summary (always generate ' +
                'before update_cve_research_summary — show draft first, save only on confirm). Call get_cve first — if ' +
                'researchSummary has text and user only wanted to read it, present stored text in finish instead. ' +
                'Invokes internal sub-agent: reads get_cve and research documents (no web). ' +
                'After chat-only self-summary, user may accept your offer to run this for a detailed draft. ' +
                'Run optional web_search/web_fetch first if user asked for fresh web material. ' +
                'Optional additionalContext: curated operator notes (max 8192 chars).',
            schema: CallSummaryGenerationSchema,
        },
    );
}
