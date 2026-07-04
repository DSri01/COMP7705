import { describe, it, expect } from '@jest/globals';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

import {
    MAX_TOOL_ITERATIONS,
    routeAfterToolActor,
} from '../../../../src/agents/agent-graphs/platform-assistant/edges.js';
import {
    PLATFORM_ASSISTANT_MAX_TOOL_ITERATIONS,
} from '../../../../src/agents/agent-graphs/platform-assistant/turn-budget.js';
import type { PlatformAssistantStateType } from '../../../../src/agents/agent-graphs/platform-assistant/state.js';

function stateWithAiRounds(
    aiRounds: number,
    lastToolName = 'web_search',
): PlatformAssistantStateType {
    const toolMessages: PlatformAssistantStateType['toolMessages'] = [];
    for (let i = 0; i < aiRounds; i++) {
        toolMessages.push(new AIMessage({ content: `step ${i + 1}` }));
        toolMessages.push(
            new ToolMessage({
                content: 'ok',
                tool_call_id: `tc-${i}`,
                name: lastToolName,
            }),
        );
    }
    return {
        userMessage: 'research CVE',
        chatHistory: [],
        toolMessages,
        finalAnswer: null,
    };
}

describe('platform-assistant routeAfterToolActor', () => {
    it('MAX_TOOL_ITERATIONS matches platform assistant budget constant', () => {
        expect(MAX_TOOL_ITERATIONS).toBe(PLATFORM_ASSISTANT_MAX_TOOL_ITERATIONS);
        expect(MAX_TOOL_ITERATIONS).toBe(25);
    });

    it('routes to compile_result when the last tool message is finish', () => {
        const state = stateWithAiRounds(1, 'finish');
        expect(routeAfterToolActor(state)).toBe('compile_result');
    });

    it('loops to tool_actor while within the iteration budget', () => {
        const state = stateWithAiRounds(MAX_TOOL_ITERATIONS);
        expect(routeAfterToolActor(state)).toBe('tool_actor');
    });

    it('routes to apologise when iteration count exceeds the budget', () => {
        const state = stateWithAiRounds(MAX_TOOL_ITERATIONS + 1);
        expect(routeAfterToolActor(state)).toBe('apologise');
    });
});
