import { ToolMessage } from '@langchain/core/messages';

import type { SummaryGenerationStateType } from '../state.js';

/** Extracts finalAnswer from the finish tool message, or falls back to the last tool result. */
export function compileSummaryGenerationFinalAnswer(
    toolMessages: SummaryGenerationStateType['toolMessages'],
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
        return 'ERROR: summary generation did not produce a result.';
    }

    return String(lastToolMsg.content);
}

/** Creates the compile_result graph node. */
export function createCompileResultNode() {
    return (state: SummaryGenerationStateType): { finalAnswer: string } => ({
        finalAnswer: compileSummaryGenerationFinalAnswer(state.toolMessages),
    });
}
