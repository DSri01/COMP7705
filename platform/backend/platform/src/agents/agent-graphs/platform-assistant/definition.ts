import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { MemorySaver, StateGraph } from '@langchain/langgraph';

import { createContextAwareToolActorNode } from '../../lib/context/context-aware-tool-actor.js';
import { PLATFORM_CONTEXT_CONFIG, createAgentContextManager } from '../../lib/context/index.js';
import type { AgentContextManager } from '../../lib/context/manager.js';
import type { ToolCapableLlm } from '../../lib/tool-loop/tool-loop.js';
import type { PlatformDbToolContext } from '../../tool-registry/db/context.js';
import type { WebSearchProvider } from '../../../web/search/types.js';
import { routeAfterToolActor } from './edges.js';
import { createApologiseNode } from './nodes/apologise.js';
import { createCompileResultNode } from './nodes/compile-result.js';
import { buildPlatformAssistantToolActorPrompt } from './prompts.js';
import { PlatformAssistantState, type PlatformAssistantStateType } from './state.js';
import { buildAdviceGenerationAgent } from '../advice-generation-agent/definition.js';
import { AdviceGenerationTurnBudget } from '../advice-generation-agent/turn-budget.js';
import { buildSummaryGenerationAgent } from '../summary-generation-agent/definition.js';
import { SummaryGenerationTurnBudget } from '../summary-generation-agent/turn-budget.js';
import { createPlatformAssistantTools } from './tools.js';
import { PlatformAssistantTurnBudget } from './turn-budget.js';

/** Options for {@link buildPlatformAssistantAgent}. */
export interface PlatformAssistantAgentOptions {
    llm: ToolCapableLlm;
    checkpointer: MemorySaver;
    dbTools: PlatformDbToolContext;
    contextManager: AgentContextManager;
    webSearch: WebSearchProvider;
    turnBudget?: PlatformAssistantTurnBudget;
}

/**
 * Builds the platform assistant: context-aware tool actor, DB tools, and multi-turn chat history.
 */
export function buildPlatformAssistantAgent({
    llm,
    checkpointer,
    dbTools,
    contextManager,
    webSearch,
    turnBudget = new PlatformAssistantTurnBudget(),
}: PlatformAssistantAgentOptions) {
    const summaryContextManager = createAgentContextManager('summary-generation-agent', {
        ...PLATFORM_CONTEXT_CONFIG,
        criticalToolNames: ['finish', 'get_cve_research_document'],
        debugLog: false,
    });
    const summaryTurnBudget = new SummaryGenerationTurnBudget();
    const summaryGeneration = buildSummaryGenerationAgent({
        llm,
        dbTools,
        contextManager: summaryContextManager,
        turnBudget: summaryTurnBudget,
    });

    const adviceContextManager = createAgentContextManager('advice-generation-agent', {
        ...PLATFORM_CONTEXT_CONFIG,
        criticalToolNames: ['finish', 'get_cve_research_document', 'get_image_cve'],
        debugLog: false,
    });
    const adviceTurnBudget = new AdviceGenerationTurnBudget();
    const adviceGeneration = buildAdviceGenerationAgent({
        llm,
        dbTools,
        contextManager: adviceContextManager,
        turnBudget: adviceTurnBudget,
    });

    const tools = createPlatformAssistantTools(
        dbTools,
        contextManager,
        { webSearch },
        turnBudget,
        {
            summaryGeneration,
            summaryInvocation: {
                contextManager: summaryContextManager,
                turnBudget: summaryTurnBudget,
            },
            adviceGeneration,
            adviceInvocation: {
                contextManager: adviceContextManager,
                turnBudget: adviceTurnBudget,
            },
        },
    );

    const toolActor = createContextAwareToolActorNode<PlatformAssistantStateType>({
        llm,
        tools,
        buildPrompt: (state, toolList) => {
            const threadId = contextManager.getActiveThreadId() ?? 'default-thread';
            const currentLlmStep =
                state.toolMessages.filter((m) => m instanceof AIMessage).length + 1;
            return buildPlatformAssistantToolActorPrompt(
                state,
                toolList,
                turnBudget,
                threadId,
                currentLlmStep,
            );
        },
        contextManager,
        pinnedLines: (state) => [
            'agent: platform-assistant',
            `userMessage: ${state.userMessage}`,
            'scope: record canonical cveId / projectId / componentId in working_area_append; tool calls still need explicit ids',
            'researchSummary: empty → call_summary_generation_agent; update/save → generate first then update on confirm; chat-only → offer detailed summary',
            'advice: unset → call_advice_generation_agent; update/save → generate first then update on confirm; chat-only triage → offer detailed advice',
            'researchDocs: summary sub-agent reads DB docs; platform spot-checks only; read_context_range is demo-only (demo:cve-research-doc)',
        ],
        documentGrounded: true,
    });

    const compileResult = createCompileResultNode();
    const apologise = createApologiseNode();

    const summarizerNode = (state: PlatformAssistantStateType) => ({
        chatHistory: [
            new HumanMessage(state.userMessage),
            new AIMessage(state.finalAnswer ?? ''),
        ],
    });

    return new StateGraph(PlatformAssistantState)
        .addNode('tool_actor', toolActor)
        .addNode('compile_result', compileResult)
        .addNode('apologise', apologise)
        .addNode('summarizer', summarizerNode)
        .addEdge('__start__', 'tool_actor')
        .addConditionalEdges('tool_actor', routeAfterToolActor, {
            tool_actor: 'tool_actor',
            compile_result: 'compile_result',
            apologise: 'apologise',
        })
        .addEdge('compile_result', 'summarizer')
        .addEdge('apologise', 'summarizer')
        .addEdge('summarizer', '__end__')
        .compile({ checkpointer });
}

/** Compiled platform assistant graph. */
export type PlatformAssistantAgent = ReturnType<typeof buildPlatformAssistantAgent>;
