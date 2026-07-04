import { AIMessage } from '@langchain/core/messages';
import { MemorySaver, StateGraph } from '@langchain/langgraph';

import { createContextAwareToolActorNode } from '../../lib/context/context-aware-tool-actor.js';
import type { AgentContextManager } from '../../lib/context/manager.js';
import type { ToolCapableLlm } from '../../lib/tool-loop/tool-loop.js';
import type { PlatformDbToolContext } from '../../tool-registry/db/context.js';
import { routeAfterToolActor } from './edges.js';
import { createApologiseNode } from './nodes/apologise.js';
import { createCompileResultNode } from './nodes/compile-result.js';
import { buildSummaryGenerationToolActorPrompt } from './prompts.js';
import { SummaryGenerationState, type SummaryGenerationStateType } from './state.js';
import { createSummaryGenerationTools } from './tools.js';
import { SummaryGenerationTurnBudget } from './turn-budget.js';

/** Options for {@link buildSummaryGenerationAgent}. */
export interface SummaryGenerationAgentOptions {
    llm: ToolCapableLlm;
    checkpointer?: MemorySaver;
    dbTools: PlatformDbToolContext;
    contextManager: AgentContextManager;
    turnBudget?: SummaryGenerationTurnBudget;
}

/**
 * Builds the summary-generation task agent: read CVE + research docs, synthesize draft summary.
 * Internal-only — invoked via `call_summary_generation_agent` on platform-assistant or CLI.
 */
export function buildSummaryGenerationAgent({
    llm,
    checkpointer,
    dbTools,
    contextManager,
    turnBudget = new SummaryGenerationTurnBudget(),
}: SummaryGenerationAgentOptions) {
    const tools = createSummaryGenerationTools(dbTools, contextManager, turnBudget);

    const toolActor = createContextAwareToolActorNode<SummaryGenerationStateType>({
        llm,
        tools,
        buildPrompt: (state, toolList) => {
            const threadId = contextManager.getActiveThreadId() ?? 'default-thread';
            const currentLlmStep =
                state.toolMessages.filter((m) => m instanceof AIMessage).length + 1;
            return buildSummaryGenerationToolActorPrompt(
                state,
                toolList,
                turnBudget,
                threadId,
                currentLlmStep,
            );
        },
        contextManager,
        pinnedLines: (state) => [
            'agent: summary-generation-agent',
            `cveId: ${state.cveId}`,
            state.additionalContext.trim().length > 0
                ? 'additionalContext: present (see prompt section; untrusted)'
                : 'additionalContext: none',
            'output: draft research summary via finish — platform-assistant persists after user confirm',
        ],
        documentGrounded: true,
    });

    const compileResult = createCompileResultNode();
    const apologise = createApologiseNode();

    return new StateGraph(SummaryGenerationState)
        .addNode('tool_actor', toolActor)
        .addNode('compile_result', compileResult)
        .addNode('apologise', apologise)
        .addEdge('__start__', 'tool_actor')
        .addConditionalEdges('tool_actor', routeAfterToolActor, {
            tool_actor: 'tool_actor',
            compile_result: 'compile_result',
            apologise: 'apologise',
        })
        .addEdge('compile_result', '__end__')
        .addEdge('apologise', '__end__')
        .compile({ checkpointer });
}

/** Compiled summary-generation graph. */
export type SummaryGenerationAgent = ReturnType<typeof buildSummaryGenerationAgent>;
