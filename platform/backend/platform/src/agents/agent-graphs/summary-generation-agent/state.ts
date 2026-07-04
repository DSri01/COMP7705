import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

/** LangGraph state for the summary-generation task agent (single CVE synthesis). */
export const SummaryGenerationState = Annotation.Root({
    cveId: Annotation<string>({
        reducer: (_prev, next) => next,
    }),

    additionalContext: Annotation<string>({
        reducer: (_prev, next) => next,
        default: () => '',
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

export type SummaryGenerationStateType = typeof SummaryGenerationState.State;
