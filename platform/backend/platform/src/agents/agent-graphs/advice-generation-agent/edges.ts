import { AIMessage, ToolMessage } from '@langchain/core/messages';

import type { AdviceGenerationStateType } from './state.js';
import { ADVICE_GENERATION_MAX_TOOL_ITERATIONS } from './turn-budget.js';

/** Maximum tool_actor iterations before routing to apologise. */
export const MAX_TOOL_ITERATIONS = ADVICE_GENERATION_MAX_TOOL_ITERATIONS;

/** Routes after tool_actor: finish tool → compile_result, else loop or apologise. */
export function routeAfterToolActor(
    state: AdviceGenerationStateType,
): 'tool_actor' | 'compile_result' | 'apologise' {
    const iterCount = state.toolMessages.filter((m) => m instanceof AIMessage).length;
    if (iterCount > MAX_TOOL_ITERATIONS) {
        return 'apologise';
    }

    const lastMsg = state.toolMessages.at(-1);
    if (lastMsg instanceof ToolMessage && lastMsg.name === 'finish') {
        return 'compile_result';
    }

    return 'tool_actor';
}
