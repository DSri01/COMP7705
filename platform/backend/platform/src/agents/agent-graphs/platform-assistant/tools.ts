import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { createContextTools, type AgentContextManager } from '../../lib/context/index.js';
import type { PlatformDbToolContext } from '../../tool-registry/db/context.js';
import { createGetComponentImageCveStatsTool } from '../../tool-registry/db/read/get-component-image-cve-stats.js';
import { createGetComponentTool } from '../../tool-registry/db/read/get-component.js';
import { createGetCveResearchDocumentTool } from '../../tool-registry/db/read/get-cve-research-document.js';
import { createGetCveTool } from '../../tool-registry/db/read/get-cve.js';
import { createGetCurrentImageTool } from '../../tool-registry/db/read/get-current-image.js';
import { createGetImageCveTool } from '../../tool-registry/db/read/get-image-cve.js';
import { createGetOpenVexTool } from '../../tool-registry/db/read/get-openvex.js';
import { createGetProjectImageCveStatsTool } from '../../tool-registry/db/read/get-project-image-cve-stats.js';
import { createGetProjectTool } from '../../tool-registry/db/read/get-project.js';
import { createListComponentsTool } from '../../tool-registry/db/read/list-components.js';
import { createListCveResearchDocumentsTool } from '../../tool-registry/db/read/list-cve-research-documents.js';
import { createListDisabledImageCvesTool } from '../../tool-registry/db/read/list-disabled-image-cves.js';
import { createListImageCvesTool } from '../../tool-registry/db/read/list-image-cves.js';
import { createListProjectsTool } from '../../tool-registry/db/read/list-projects.js';
import { createUpdateCveResearchSummaryTool } from '../../tool-registry/db/write/update-cve-research-summary.js';
import { createUpdateImageCveAdviceTool } from '../../tool-registry/db/write/update-image-cve-advice.js';
import { convertUnixTimeTool } from '../../tool-registry/general/convert-unix-time.js';
import { createCallAdviceGenerationTool } from '../../tool-registry/subagents/call-advice-generation.js';
import { createCallSummaryGenerationTool } from '../../tool-registry/subagents/call-summary-generation.js';
import { createWebFetchUrlMarkdownTool } from '../../tool-registry/web/web-fetch-url-markdown.js';
import { createWebSearchTool } from '../../tool-registry/web/web-search.js';
import type { WebSearchProvider } from '../../../web/search/types.js';
import type { AdviceGenerationInvocationDeps } from '../../tool-registry/subagents/call-advice-generation.js';
import type { SummaryGenerationInvocationDeps } from '../../tool-registry/subagents/call-summary-generation.js';
import type { AdviceGenerationAgent } from '../advice-generation-agent/definition.js';
import type { SummaryGenerationAgent } from '../summary-generation-agent/definition.js';
import type { PlatformAssistantTurnBudget } from './turn-budget.js';

async function finishToolHandler({ response }: { response: string }): Promise<string> {
    return response;
}

/** Ends the turn with a natural-language reply. Tool name: `finish`. */
export const platformAssistantFinishTool = tool(finishToolHandler, {
    name: 'finish',
    description:
        'Required to end every turn. Send your full natural-language reply to the user. ' +
        'Always call this tool — do not put the final reply only in plain message text.',
    schema: z.object({
        response: z.string().describe('The complete reply the user should see'),
    }),
});

/** Injected backends for platform-assistant web tools. */
export type PlatformAssistantWebTools = {
    webSearch: WebSearchProvider;
};

/** Task sub-agents invoked via call_* tools on platform-assistant. */
export type PlatformAssistantTaskAgents = {
    summaryGeneration: SummaryGenerationAgent;
    summaryInvocation: SummaryGenerationInvocationDeps;
    adviceGeneration: AdviceGenerationAgent;
    adviceInvocation: AdviceGenerationInvocationDeps;
};

/**
 * Platform assistant tool allowlist: platform DB reads/writes + web + context library + finish.
 */
export function createPlatformAssistantTools(
    dbTools: PlatformDbToolContext,
    contextManager: AgentContextManager,
    webTools: PlatformAssistantWebTools,
    turnBudget: PlatformAssistantTurnBudget,
    taskAgents: PlatformAssistantTaskAgents,
): StructuredTool<z.ZodObject<z.ZodRawShape>>[] {
    const resolveThreadId = () => contextManager.getActiveThreadId() ?? 'default-thread';
    const budgetDeps = { turnBudget, resolveThreadId };

    const domain = [
        createListProjectsTool(dbTools),
        createGetProjectTool(dbTools),
        createListComponentsTool(dbTools),
        createGetComponentTool(dbTools),
        createGetCurrentImageTool(dbTools),
        createListImageCvesTool(dbTools),
        createListDisabledImageCvesTool(dbTools),
        createGetImageCveTool(dbTools),
        createGetCveTool(dbTools),
        createListCveResearchDocumentsTool(dbTools),
        createGetCveResearchDocumentTool(dbTools, budgetDeps),
        createGetOpenVexTool(dbTools),
        createGetProjectImageCveStatsTool(dbTools),
        createGetComponentImageCveStatsTool(dbTools),
        createUpdateCveResearchSummaryTool(dbTools),
        createUpdateImageCveAdviceTool(dbTools),
        createWebSearchTool({ provider: webTools.webSearch, ...budgetDeps }),
        createWebFetchUrlMarkdownTool(dbTools, budgetDeps),
        createCallSummaryGenerationTool(
            taskAgents.summaryGeneration,
            dbTools,
            taskAgents.summaryInvocation,
        ),
        createCallAdviceGenerationTool(
            taskAgents.adviceGeneration,
            dbTools,
            taskAgents.adviceInvocation,
        ),
        convertUnixTimeTool,
        platformAssistantFinishTool,
    ];
    return [...domain, ...createContextTools(contextManager)] as StructuredTool<
        z.ZodObject<z.ZodRawShape>
    >[];
}
