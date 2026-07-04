import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { createContextTools, type AgentContextManager } from '../../lib/context/index.js';
import type { PlatformDbToolContext } from '../../tool-registry/db/context.js';
import { createGetCveResearchDocumentTool } from '../../tool-registry/db/read/get-cve-research-document.js';
import { createGetCveTool } from '../../tool-registry/db/read/get-cve.js';
import { createListCveResearchDocumentsTool } from '../../tool-registry/db/read/list-cve-research-documents.js';
import type { SummaryGenerationTurnBudget } from './turn-budget.js';

async function finishToolHandler({ response }: { response: string }): Promise<string> {
    return response;
}

/** Ends the task with the draft research summary. Tool name: `finish`. */
export const summaryGenerationFinishTool = tool(finishToolHandler, {
    name: 'finish',
    description:
        'Required to end the task. Send the complete draft CVE research summary as plain prose. ' +
        'Always call this tool — do not put the final draft only in plain message text.',
    schema: z.object({
        response: z.string().describe('The full draft research summary for the CVE'),
    }),
});

/**
 * Summary-generation allowlist: CVE + research doc reads, context library, finish.
 * No web tools, writes, or call_* orchestration tools.
 */
export function createSummaryGenerationTools(
    dbTools: PlatformDbToolContext,
    contextManager: AgentContextManager,
    turnBudget: SummaryGenerationTurnBudget,
): StructuredTool<z.ZodObject<z.ZodRawShape>>[] {
    const resolveThreadId = () => contextManager.getActiveThreadId() ?? 'default-thread';
    const budgetDeps = { turnBudget, resolveThreadId };

    const domain = [
        createGetCveTool(dbTools),
        createListCveResearchDocumentsTool(dbTools),
        createGetCveResearchDocumentTool(dbTools, budgetDeps),
        summaryGenerationFinishTool,
    ];
    return [...domain, ...createContextTools(contextManager)] as StructuredTool<
        z.ZodObject<z.ZodRawShape>
    >[];
}
