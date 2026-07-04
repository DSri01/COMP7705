import { config } from 'dotenv';
import { MemorySaver } from '@langchain/langgraph';

import { buildSummaryGenerationAgent } from '../../../agents/agent-graphs/summary-generation-agent/definition.js';
import { SummaryGenerationTurnBudget } from '../../../agents/agent-graphs/summary-generation-agent/turn-budget.js';
import {
    PLATFORM_CONTEXT_CONFIG,
    createAgentContextManager,
    seedDemoResearchDocument,
} from '../../../agents/lib/context/index.js';
import { getContextLogger } from '../../../agents/lib/loggers/context-logger.js';
import { createLlmFromConfiguration } from '../../../agents/utils/create-llm.js';
import { loadConfiguration } from '../../../configuration/definition.js';
import { createCliPlatformDbToolContext } from '../utils/create-platform-db-tool-context.js';
import {
    parseSummaryGenerationCliArgs,
    printSummaryGenerationCliUsage,
} from './parse-args.js';

const SUMMARY_GENERATION_CLI_THREAD_ID = 'summary-generation-cli-001';

async function main(): Promise<void> {
    const { cveId, additionalContext, contextDebug, showHelp } = parseSummaryGenerationCliArgs(
        process.argv.slice(2),
    );

    if (showHelp) {
        printSummaryGenerationCliUsage();
        return;
    }

    if (!cveId) {
        console.error('Missing required --cve-id');
        printSummaryGenerationCliUsage();
        process.exit(1);
    }

    config({ path: '.env' });
    const configuration = loadConfiguration();
    const llm = createLlmFromConfiguration(configuration.agents.llmProvider);

    const { dbTools, shutdown } = await createCliPlatformDbToolContext(configuration);

    try {
        const contextManager = createAgentContextManager('summary-generation-agent', {
            ...PLATFORM_CONTEXT_CONFIG,
            criticalToolNames: ['finish', 'get_cve_research_document'],
            debugLog: contextDebug,
        });

        seedDemoResearchDocument();
        if (contextDebug) {
            getContextLogger().info(
                { config: 'PLATFORM_CONTEXT_CONFIG' },
                'CLI summary-generation context',
            );
        }

        const turnBudget = new SummaryGenerationTurnBudget();
        const agent = buildSummaryGenerationAgent({
            llm,
            checkpointer: new MemorySaver(),
            dbTools,
            contextManager,
            turnBudget,
        });

        contextManager.beginTurn(SUMMARY_GENERATION_CLI_THREAD_ID);
        turnBudget.beginTurn(SUMMARY_GENERATION_CLI_THREAD_ID);

        const result = await agent.invoke(
            {
                cveId,
                additionalContext,
                toolMessages: [],
            },
            {
                recursionLimit: 50,
                configurable: { thread_id: SUMMARY_GENERATION_CLI_THREAD_ID },
            },
        );

        const draft = result.finalAnswer ?? 'ERROR: summary generation did not produce a draft.';
        console.log(`\n--- Draft research summary for ${cveId} ---\n`);
        console.log(draft);
    } finally {
        await shutdown();
    }
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
