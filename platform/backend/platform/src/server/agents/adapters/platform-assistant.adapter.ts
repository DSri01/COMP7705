import { AIMessage, HumanMessage } from '@langchain/core/messages';

import type { PlatformAssistantAgent } from '../../../agents/agent-graphs/platform-assistant/definition.js';
import type { PlatformAssistantStateType } from '../../../agents/agent-graphs/platform-assistant/state.js';
import type { PlatformAssistantTurnBudget } from '../../../agents/agent-graphs/platform-assistant/turn-budget.js';
import type { AgentContextManager } from '../../../agents/lib/context/index.js';
import type { ThreadedAgent, ThreadMessage } from '../threaded-agent.js';

const DEFAULT_RECURSION_LIMIT = 50;

/**
 * Adapts the platform assistant LangGraph to {@link ThreadedAgent}.
 */
export class PlatformAssistantServerAdapter implements ThreadedAgent {
    constructor(
        private readonly graph: PlatformAssistantAgent,
        private readonly contextManager: AgentContextManager,
        private readonly turnBudget: PlatformAssistantTurnBudget,
    ) {}

    /** @inheritdoc */
    async runTurn(threadId: string, userMessage: string): Promise<string> {
        this.contextManager.beginTurn(threadId);
        this.turnBudget.beginTurn(threadId);

        const eventStream = await this.graph.stream(
            { userMessage, toolMessages: [] },
            {
                configurable: { thread_id: threadId },
                recursionLimit: DEFAULT_RECURSION_LIMIT,
                streamMode: 'updates',
            },
        );

        let finalAnswer: string | null = null;
        for await (const event of eventStream) {
            const update = Object.values(event)[0] as Partial<PlatformAssistantStateType>;
            if (typeof update.finalAnswer === 'string') {
                finalAnswer = update.finalAnswer;
            }
        }

        return finalAnswer ?? 'No answer produced';
    }

    /** @inheritdoc */
    async getMessages(threadId: string): Promise<ThreadMessage[]> {
        const snapshot = await this.graph.getState({ configurable: { thread_id: threadId } });
        const { chatHistory = [] } = snapshot.values as PlatformAssistantStateType;

        return chatHistory
            .filter((m): m is HumanMessage | AIMessage => m instanceof HumanMessage || m instanceof AIMessage)
            .map((m) => ({
                role: m instanceof HumanMessage ? ('human' as const) : ('assistant' as const),
                content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            }));
    }
}
