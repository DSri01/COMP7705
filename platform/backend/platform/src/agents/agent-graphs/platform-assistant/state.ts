import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

/**
 * LangGraph state for the platform assistant (CVE/platform data + chat).
 */
export const PlatformAssistantState = Annotation.Root({
    userMessage: Annotation<string>({
        reducer: (_prev, next) => next,
    }),

    chatHistory: Annotation<BaseMessage[]>({
        reducer: (prev, next) => [...prev, ...next],
        default: () => [],
    }),

    toolMessages: Annotation<BaseMessage[]>({
        reducer: (_prev, next) => next,
        default: () => [],
    }),

    finalAnswer: Annotation<string | null>({
        reducer: (_prev, next) => next,
        default: () => null,
    }),
});

export type PlatformAssistantStateType = typeof PlatformAssistantState.State;
