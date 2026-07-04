import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

/** LangGraph state for the advice-generation task agent (single image-CVE synthesis). */
export const AdviceGenerationState = Annotation.Root({
    projectId: Annotation<string>({
        reducer: (_prev, next) => next,
    }),

    componentId: Annotation<string>({
        reducer: (_prev, next) => next,
    }),

    cveId: Annotation<string>({
        reducer: (_prev, next) => next,
    }),

    /** Resolved during call_* pre-validation or first list_image_cves read. */
    imageCveId: Annotation<string>({
        reducer: (_prev, next) => next,
        default: () => '',
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

export type AdviceGenerationStateType = typeof AdviceGenerationState.State;
