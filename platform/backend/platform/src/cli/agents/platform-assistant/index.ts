import { config } from 'dotenv';
import { MemorySaver } from '@langchain/langgraph';

import { buildPlatformAssistantAgent } from '../../../agents/agent-graphs/platform-assistant/definition.js';
import { PlatformAssistantTurnBudget } from '../../../agents/agent-graphs/platform-assistant/turn-budget.js';
import {
    PLATFORM_CONTEXT_CONFIG,
    createAgentContextManager,
    seedDemoResearchDocument,
} from '../../../agents/lib/context/index.js';
import { getContextLogger } from '../../../agents/lib/loggers/context-logger.js';
import { createLlmFromConfiguration } from '../../../agents/utils/create-llm.js';
import { loadConfiguration } from '../../../configuration/definition.js';
import { createWebSearchProviderFromConfiguration } from '../../../web/search/index.js';
import { createCliPlatformDbToolContext } from '../utils/create-platform-db-tool-context.js';
import { runInteractiveAgentCli } from '../utils/run-interactive-agent-cli.js';
import {
    parsePlatformAssistantCliArgs,
    printPlatformAssistantCliUsage,
} from './parse-args.js';

const PLATFORM_ASSISTANT_THREAD_ID = 'platform-assistant-cli-001';

async function main(): Promise<void> {
    const { disableContext, contextDebug, argvGoal, showHelp } = parsePlatformAssistantCliArgs(
        process.argv.slice(2),
    );

    if (showHelp) {
        printPlatformAssistantCliUsage();
        return;
    }

    if (disableContext) {
        console.error(
            'platform-assistant requires the context library; --no-context is not supported.',
        );
        process.exit(1);
    }

    config({ path: '.env' });
    const configuration = loadConfiguration();
    const llm = createLlmFromConfiguration(configuration.agents.llmProvider);
    const webSearch = createWebSearchProviderFromConfiguration(
        configuration.agents.webSearchProvider,
    );

    const { dbTools, shutdown } = await createCliPlatformDbToolContext(configuration);

    try {
        const contextManager = createAgentContextManager('platform-assistant', {
            ...PLATFORM_CONTEXT_CONFIG,
            debugLog: contextDebug,
        });

        seedDemoResearchDocument();
        if (contextDebug) {
            getContextLogger().info(
                { config: 'PLATFORM_CONTEXT_CONFIG' },
                'CLI platform-assistant context',
            );
        }

        const turnBudget = new PlatformAssistantTurnBudget();
        const agent = buildPlatformAssistantAgent({
            llm,
            checkpointer: new MemorySaver(),
            dbTools,
            contextManager,
            webSearch,
            turnBudget,
        });

        const llmProviderLabel = configuration.agents.llmProvider.provider;
        const webSearchProviderLabel = configuration.agents.webSearchProvider.provider;

        await runInteractiveAgentCli({
            agent,
            threadId: PLATFORM_ASSISTANT_THREAD_ID,
            beforeTurn: (threadId) => {
                contextManager.beginTurn(threadId);
                turnBudget.beginTurn(threadId);
            },
            argvSeed: argvGoal || undefined,
            introLines: [
                `llm provider: ${llmProviderLabel}`,
                `web search provider: ${webSearchProviderLabel}`,
                'Platform assistant — type a message, or \\exit to quit.',
                'DB navigation tools enabled (list_projects … get_current_image); convert_unix_time for timestamps. Context library enabled (PLATFORM_CONTEXT_CONFIG).\n',
            ],
            toInput: (userMessage) => ({ userMessage, toolMessages: [] }),
        });
    } finally {
        await shutdown();
    }
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
