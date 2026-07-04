import { ToolMessage } from '@langchain/core/messages';

import { MAX_TOOL_ITERATIONS } from '../edges.js';
import type { PlatformAssistantStateType } from '../state.js';

/** Creates the apologise graph node when {@link MAX_TOOL_ITERATIONS} is exceeded. */
export function createApologiseNode() {
    return (state: PlatformAssistantStateType): { finalAnswer: string } => {
        const partialResults = state.toolMessages
            .filter((m): m is ToolMessage => m instanceof ToolMessage && m.name !== 'finish')
            .map((m) => `  • ${m.name}: ${String(m.content)}`)
            .join('\n');

        const partialSection = partialResults ? ` Partial results:\n${partialResults}` : '';

        return {
            finalAnswer:
                `I could not finish within ${MAX_TOOL_ITERATIONS} steps.${partialSection} ` +
                'Please try a simpler request.',
        };
    };
}
