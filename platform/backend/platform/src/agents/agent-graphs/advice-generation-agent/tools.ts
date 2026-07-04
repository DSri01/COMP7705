import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { createContextTools, type AgentContextManager } from '../../lib/context/index.js';
import type { PlatformDbToolContext } from '../../tool-registry/db/context.js';
import { createGetComponentTool } from '../../tool-registry/db/read/get-component.js';
import { createGetCveResearchDocumentTool } from '../../tool-registry/db/read/get-cve-research-document.js';
import { createGetCveTool } from '../../tool-registry/db/read/get-cve.js';
import { createGetCurrentImageTool } from '../../tool-registry/db/read/get-current-image.js';
import { createGetImageCveTool } from '../../tool-registry/db/read/get-image-cve.js';
import { createListCveResearchDocumentsTool } from '../../tool-registry/db/read/list-cve-research-documents.js';
import { createListImageCvesTool } from '../../tool-registry/db/read/list-image-cves.js';
import { createGetSsvcCisaFrameworkTool } from '../../tool-registry/ssvc/get-ssvc-cisa-framework.js';
import { createLookupSsvcCisaOutcomeTool } from '../../tool-registry/ssvc/lookup-ssvc-cisa-outcome.js';
import type { AdviceGenerationTurnBudget } from './turn-budget.js';

async function finishToolHandler({ response }: { response: string }): Promise<string> {
    return response;
}

/** Ends the task with the draft image-CVE advice. Tool name: `finish`. */
export const adviceGenerationFinishTool = tool(finishToolHandler, {
    name: 'finish',
    description:
        'Required to end the task. Send the complete draft image-CVE advice as plain prose (markdown OK). ' +
        'Always call this tool — do not put the final draft only in plain message text.',
    schema: z.object({
        response: z.string().describe('The full draft advice for this image-CVE pairing'),
    }),
});

/**
 * Advice-generation allowlist: image-CVE + CVE + research doc reads, CISA SSVC tools, context library, finish.
 * No web tools, writes, or call_* orchestration tools.
 */
export function createAdviceGenerationTools(
    dbTools: PlatformDbToolContext,
    contextManager: AgentContextManager,
    turnBudget: AdviceGenerationTurnBudget,
): StructuredTool<z.ZodObject<z.ZodRawShape>>[] {
    const resolveThreadId = () => contextManager.getActiveThreadId() ?? 'default-thread';
    const budgetDeps = { turnBudget, resolveThreadId };

    const domain = [
        createListImageCvesTool(dbTools),
        createGetImageCveTool(dbTools),
        createGetComponentTool(dbTools),
        createGetCurrentImageTool(dbTools),
        createGetCveTool(dbTools),
        createListCveResearchDocumentsTool(dbTools),
        createGetCveResearchDocumentTool(dbTools, budgetDeps),
        createGetSsvcCisaFrameworkTool(),
        createLookupSsvcCisaOutcomeTool(),
        adviceGenerationFinishTool,
    ];
    return [...domain, ...createContextTools(contextManager)] as StructuredTool<
        z.ZodObject<z.ZodRawShape>
    >[];
}
