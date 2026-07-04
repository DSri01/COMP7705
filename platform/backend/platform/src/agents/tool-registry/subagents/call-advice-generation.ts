import { randomUUID } from 'node:crypto';

import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import type { AdviceGenerationAgent } from '../../agent-graphs/advice-generation-agent/definition.js';
import type { AdviceGenerationTurnBudget } from '../../agent-graphs/advice-generation-agent/turn-budget.js';
import type { AgentContextManager } from '../../lib/context/manager.js';
import type { PlatformDbToolContext } from '../db/context.js';
import { resolveImageCveByCveIdDbHandler } from '../db/read/resolve-image-cve-by-cve-id.js';
import { ComponentScopeSchema } from '../db/schemas/component-scope.js';
import { CveIdSchema } from '../db/schemas/cve-id.js';

const ADDITIONAL_CONTEXT_MAX_CHARS = 8192;

const CallAdviceGenerationSchema = ComponentScopeSchema.extend({
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

export type AdviceGenerationInvocationDeps = {
    contextManager: AgentContextManager;
    turnBudget: AdviceGenerationTurnBudget;
};

/**
 * Wraps the advice-generation graph as `call_advice_generation_agent` on platform-assistant.
 *
 * Each invocation uses a fresh inner `thread_id` and separate context/budget scope.
 * Tool name: `call_advice_generation_agent`.
 */
export function createCallAdviceGenerationTool(
    adviceGenerationAgent: AdviceGenerationAgent,
    dbTools: PlatformDbToolContext,
    invocationDeps: AdviceGenerationInvocationDeps,
): StructuredTool<typeof CallAdviceGenerationSchema> {
    const { contextManager, turnBudget } = invocationDeps;

    return tool(
        async ({ projectId, componentId, cveId, additionalContext }) => {
            const resolved = await resolveImageCveByCveIdDbHandler(dbTools, {
                projectId,
                componentId,
                cveId,
            });
            if (typeof resolved === 'string') {
                return resolved;
            }

            const innerThreadId = `advice-generation-${randomUUID()}`;
            contextManager.beginTurn(innerThreadId);
            turnBudget.beginTurn(innerThreadId);

            try {
                const result = await adviceGenerationAgent.invoke(
                    {
                        projectId,
                        componentId,
                        cveId,
                        imageCveId: resolved.imageCveId,
                        additionalContext: additionalContext?.trim() ?? '',
                        toolMessages: [],
                    },
                    {
                        recursionLimit: 50,
                        configurable: { thread_id: innerThreadId },
                    },
                );
                return result.finalAnswer ?? 'ERROR: advice generation did not produce a draft.';
            } finally {
                turnBudget.endTurn(innerThreadId);
            }
        },
        {
            name: 'call_advice_generation_agent',
            description:
                'Generate image-CVE advice draft for (projectId, componentId, cveId). Required when: ' +
                'get_image_cve.advice is unset (or content empty) and user asked for advice; user asks to update, refresh, ' +
                'regenerate, overwrite, or save advice (always generate before update_image_cve_advice — show draft first, save only on confirm). ' +
                'Resolve projectId/componentId first — call get_image_cve; if advice.state is set with content and user only wanted to read it, ' +
                'present stored text in finish instead. Pre-validates the CVE exists on the component current image. ' +
                'Invokes internal sub-agent: reads image-CVE, CVE, and research documents (no web). ' +
                'After chat-only triage guidance, user may accept your offer to run this for a detailed draft. ' +
                'Run optional web_search/web_fetch first if user asked for fresh web material. ' +
                'Optional additionalContext: curated operator notes for regenerate/disagreement (max 8192 chars; compose after clarifying questions — not a full thread dump).',
            schema: CallAdviceGenerationSchema,
        },
    );
}
