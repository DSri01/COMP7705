import { config } from 'dotenv';
import { MemorySaver } from '@langchain/langgraph';

import { buildAdviceGenerationAgent } from '../../../agents/agent-graphs/advice-generation-agent/definition.js';
import { AdviceGenerationTurnBudget } from '../../../agents/agent-graphs/advice-generation-agent/turn-budget.js';
import {
    PLATFORM_CONTEXT_CONFIG,
    createAgentContextManager,
    seedDemoResearchDocument,
} from '../../../agents/lib/context/index.js';
import { getContextLogger } from '../../../agents/lib/loggers/context-logger.js';
import { resolveImageCveByCveIdDbHandler } from '../../../agents/tool-registry/db/read/resolve-image-cve-by-cve-id.js';
import { createLlmFromConfiguration } from '../../../agents/utils/create-llm.js';
import { loadConfiguration } from '../../../configuration/definition.js';
import { createCliPlatformDbToolContext } from '../utils/create-platform-db-tool-context.js';
import {
    parseAdviceGenerationCliArgs,
    printAdviceGenerationCliUsage,
} from './parse-args.js';

const ADVICE_GENERATION_CLI_THREAD_ID = 'advice-generation-cli-001';

async function main(): Promise<void> {
    const { projectId, componentId, cveId, additionalContext, contextDebug, showHelp } =
        parseAdviceGenerationCliArgs(process.argv.slice(2));

    if (showHelp) {
        printAdviceGenerationCliUsage();
        return;
    }

    if (!projectId || !componentId || !cveId) {
        console.error('Missing required --project-id, --component-id, and/or --cve-id');
        printAdviceGenerationCliUsage();
        process.exit(1);
    }

    config({ path: '.env' });
    const configuration = loadConfiguration();
    const llm = createLlmFromConfiguration(configuration.agents.llmProvider);

    const { dbTools, shutdown } = await createCliPlatformDbToolContext(configuration);

    try {
        const resolved = await resolveImageCveByCveIdDbHandler(dbTools, {
            projectId,
            componentId,
            cveId,
        });
        if (typeof resolved === 'string') {
            console.error(resolved);
            process.exit(1);
        }

        const contextManager = createAgentContextManager('advice-generation-agent', {
            ...PLATFORM_CONTEXT_CONFIG,
            criticalToolNames: ['finish', 'get_cve_research_document', 'get_image_cve'],
            debugLog: contextDebug,
        });

        seedDemoResearchDocument();
        if (contextDebug) {
            getContextLogger().info(
                { config: 'PLATFORM_CONTEXT_CONFIG' },
                'CLI advice-generation context',
            );
        }

        const turnBudget = new AdviceGenerationTurnBudget();
        const agent = buildAdviceGenerationAgent({
            llm,
            checkpointer: new MemorySaver(),
            dbTools,
            contextManager,
            turnBudget,
        });

        contextManager.beginTurn(ADVICE_GENERATION_CLI_THREAD_ID);
        turnBudget.beginTurn(ADVICE_GENERATION_CLI_THREAD_ID);

        const result = await agent.invoke(
            {
                projectId,
                componentId,
                cveId,
                imageCveId: resolved.imageCveId,
                additionalContext,
                toolMessages: [],
            },
            {
                recursionLimit: 50,
                configurable: { thread_id: ADVICE_GENERATION_CLI_THREAD_ID },
            },
        );

        const draft = result.finalAnswer ?? 'ERROR: advice generation did not produce a draft.';
        console.log(`\n--- Draft advice for ${cveId} (${projectId}/${componentId}) ---\n`);
        console.log(draft);
    } finally {
        await shutdown();
    }
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
