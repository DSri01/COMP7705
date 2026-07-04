import { ToolMessage } from '@langchain/core/messages';

import type { AdviceGenerationStateType } from '../state.js';

/** Extracts finalAnswer from the finish tool message, or falls back to the last tool result. */
export function compileAdviceGenerationFinalAnswer(
    toolMessages: AdviceGenerationStateType['toolMessages'],
): string {
    const finishMsg = [...toolMessages]
        .reverse()
        .find((m): m is ToolMessage => m instanceof ToolMessage && m.name === 'finish');

    if (finishMsg) {
        return String(finishMsg.content);
    }

    const lastToolMsg = [...toolMessages]
        .reverse()
        .find((m): m is ToolMessage => m instanceof ToolMessage);

    if (!lastToolMsg) {
        return 'ERROR: advice generation did not produce a result.';
    }

    return String(lastToolMsg.content);
}

/** Creates the compile_result graph node. */
export function createCompileResultNode() {
    return (state: AdviceGenerationStateType): { finalAnswer: string } => ({
        finalAnswer: compileAdviceGenerationFinalAnswer(state.toolMessages),
    });
}
