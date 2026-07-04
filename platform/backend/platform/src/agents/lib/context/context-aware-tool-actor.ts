import { AIMessage, BaseMessage, BaseMessageLike, HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { eventsToMessages } from './message-bridge.js';
import { buildDocumentContextGuidance } from './document-context-guidance.js';
import type { AgentContextManager } from './manager.js';
import { appendContextToPrompt } from './prompt.js';
import {
    executeToolCalls,
    type ToolActorPromptBuilder,
    type ToolCapableLlm,
    type ToolLoopState,
} from '../tool-loop/tool-loop.js';

/** Retries per tool_actor graph visit when the model returns no tool_calls. */
export const NO_TOOL_CALLS_MAX_RETRIES = 2;

/** Internal feedback appended to the invoke transcript only (not chatHistory). */
export const NO_TOOL_CALLS_FEEDBACK =
    'ERROR: Your last response had no tool_calls. You must call at least one structured tool ' +
    '(use finish when the turn is complete). Retry now with a real tool_call.';

function resolveThreadId(config?: RunnableConfig): string {
    const threadId = config?.configurable?.['thread_id'];
    return typeof threadId === 'string' && threadId.length > 0 ? threadId : 'default-thread';
}

/** Options for a LangGraph tool_actor node backed by {@link AgentContextManager}. */

export interface ContextAwareToolActorOptions<TState extends ToolLoopState> {
    llm: ToolCapableLlm;
    tools: StructuredTool<z.ZodObject<z.ZodRawShape>>[];
    buildPrompt: ToolActorPromptBuilder<TState>;
    contextManager: AgentContextManager;
    /** Extra pinned lines (e.g. demo resource refs) merged into the system prompt. */
    pinnedLines?: (state: TState) => string[];
    /**
     * When true, append {@link buildDocumentContextGuidance} using {@link AgentContextManager.config}
     * (configured limits, not hardcoded).
     */
    documentGrounded?: boolean;
}

/**
 * LangGraph node factory: tool actor that uses the context manager instead of full tool history.
 *
 * Reads `thread_id` from `config.configurable`, records each turn into the recent window,
 * auto-compacts when over budget, and returns `toolMessages` synced to that window.
 */
export function createContextAwareToolActorNode<TState extends ToolLoopState>(
    options: ContextAwareToolActorOptions<TState>,
): (state: TState, config?: RunnableConfig) => Promise<{ toolMessages: BaseMessage[] }> {
    const { llm, tools, buildPrompt, contextManager, pinnedLines, documentGrounded } = options;
    const boundLlm = llm.bindTools(tools);
    const toolMap = new Map(tools.map((t) => [t.name, t]));

    return async (state: TState, config?: RunnableConfig) => {
        const threadId = resolveThreadId(config);
        contextManager.setActiveSession(threadId);

        const pinned = pinnedLines?.(state) ?? [];
        const sections = contextManager.buildPromptSections(threadId, pinned);
        const agentPrompt = buildPrompt(state, tools);
        const guidance = documentGrounded
            ? `\n\n${buildDocumentContextGuidance(contextManager.config)}`
            : '';
        const system = appendContextToPrompt(agentPrompt + guidance, sections);

        const llmToolMessages = contextManager.toolMessagesForLlm(threadId);
        const messages: BaseMessageLike[] = [{ role: 'system', content: system }, ...llmToolMessages];

        let aiMessage = (await boundLlm.invoke(messages)) as AIMessage;
        let retries = 0;
        while (!aiMessage.tool_calls?.length && retries < NO_TOOL_CALLS_MAX_RETRIES) {
            messages.push(aiMessage, new HumanMessage(NO_TOOL_CALLS_FEEDBACK));
            aiMessage = (await boundLlm.invoke(messages)) as AIMessage;
            retries += 1;
        }

        if (!aiMessage.tool_calls?.length) {
            contextManager.recordNewMessages(threadId, [aiMessage]);
            contextManager.compact(threadId, false);
            return {
                toolMessages: eventsToMessages(contextManager.getOrCreate(threadId).recentEvents),
            };
        }

        const toolMessages = await executeToolCalls(aiMessage.tool_calls, toolMap);
        const newMessages: BaseMessage[] = [aiMessage, ...toolMessages];
        contextManager.recordNewMessages(threadId, newMessages);
        contextManager.compact(threadId, false);

        return {
            toolMessages: eventsToMessages(contextManager.getOrCreate(threadId).recentEvents),
        };
    };
}
