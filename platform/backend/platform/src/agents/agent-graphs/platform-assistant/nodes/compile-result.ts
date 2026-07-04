import { ToolMessage } from '@langchain/core/messages';

import type { PlatformAssistantStateType } from '../state.js';

/** Extracts finalAnswer from the finish tool message, or falls back to the last tool result. */
export function compilePlatformAssistantFinalAnswer(
    toolMessages: PlatformAssistantStateType['toolMessages'],
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
        return 'I ran into a problem and could not produce a response. Please try again.';
    }

    return String(lastToolMsg.content);
}

/** Creates the compile_result graph node. */
export function createCompileResultNode() {
    return (state: PlatformAssistantStateType): { finalAnswer: string } => ({
        finalAnswer: compilePlatformAssistantFinalAnswer(state.toolMessages),
    });
}
