import { MemorySaver } from '@langchain/langgraph';
import type { z } from 'zod';

import { buildPlatformAssistantAgent } from './agent-graphs/platform-assistant/definition.js';
import { PlatformAssistantTurnBudget } from './agent-graphs/platform-assistant/turn-budget.js';
import {
    PLATFORM_CONTEXT_CONFIG,
    createAgentContextManager,
    seedDemoResearchDocument,
} from './lib/context/index.js';
import type { AppConfigurationSchema } from '../configuration/schema.js';
import type { PlatformDbToolContext } from './tool-registry/db/context.js';
import { PlatformAssistantServerAdapter } from '../server/agents/adapters/platform-assistant.adapter.js';
import { buildAgentRegistry, type AgentRegistry } from '../server/agents/agent-registry.js';
import type { ThreadedAgent } from '../server/agents/threaded-agent.js';
import { createLlmFromConfiguration } from './utils/create-llm.js';
import { createWebSearchProviderFromConfiguration } from '../web/search/index.js';

/**
 * HTTP-mounted agent ids (source of truth).
 * Task agents and dev-only graphs are intentionally omitted.
 */
export const AGENT_IDS = ['platform-assistant'] as const;

/** Union of ids allowed on `/agents/:agentId/threads`. */
export type AgentId = (typeof AGENT_IDS)[number];

/** Config + Nest services passed into agent factories (built in {@link AgentsModule.forAgentsAsync}). */
export interface PlatformAgentBuildContext {
    configuration: z.infer<typeof AppConfigurationSchema>;
    dbTools: PlatformDbToolContext;
}

/** Builds a {@link ThreadedAgent} adapter for one manifest entry. */
type AgentFactory = (ctx: PlatformAgentBuildContext) => ThreadedAgent;

function createPlatformAssistantAgentMount(ctx: PlatformAgentBuildContext): ThreadedAgent {
    const llm = createLlmFromConfiguration(ctx.configuration.agents.llmProvider);
    const webSearch = createWebSearchProviderFromConfiguration(
        ctx.configuration.agents.webSearchProvider,
    );
    const checkpointer = new MemorySaver();
    const contextManager = createAgentContextManager('platform-assistant', {
        ...PLATFORM_CONTEXT_CONFIG,
        debugLog: false,
    });
    seedDemoResearchDocument();

    const turnBudget = new PlatformAssistantTurnBudget();
    const graph = buildPlatformAssistantAgent({
        llm,
        checkpointer,
        dbTools: ctx.dbTools,
        contextManager,
        webSearch,
        turnBudget,
    });
    return new PlatformAssistantServerAdapter(graph, contextManager, turnBudget);
}

/** One factory per {@link AGENT_IDS} entry; TypeScript enforces completeness. */
const agentFactories = {
    'platform-assistant': createPlatformAssistantAgentMount,
} satisfies Record<AgentId, AgentFactory>;

/**
 * Builds the Nest {@link AgentRegistry} after Nest services are available.
 * Wired via {@link AgentsModule.forAgentsAsync}.
 */
export function buildPlatformAgentRegistry(ctx: PlatformAgentBuildContext): AgentRegistry {
    return buildAgentRegistry(
        AGENT_IDS.map((agentId) => ({
            agentId,
            agent: agentFactories[agentId](ctx),
        })),
    );
}
