import { describe, it, expect } from '@jest/globals';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

import {
    MAX_TOOL_ITERATIONS,
    routeAfterToolActor,
} from '../../../../src/agents/agent-graphs/advice-generation-agent/edges.js';
import { ADVICE_GENERATION_MAX_TOOL_ITERATIONS } from '../../../../src/agents/agent-graphs/advice-generation-agent/turn-budget.js';
import type { AdviceGenerationStateType } from '../../../../src/agents/agent-graphs/advice-generation-agent/state.js';

function stateWithAiRounds(
    aiRounds: number,
    lastToolName = 'get_image_cve',
): AdviceGenerationStateType {
    const toolMessages: AdviceGenerationStateType['toolMessages'] = [];
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
        projectId: '11111111-1111-4111-8111-111111111111',
        componentId: '22222222-2222-4222-8222-222222222222',
        cveId: 'CVE-2024-00001',
        imageCveId: '33333333-3333-4333-8333-333333333333',
        additionalContext: '',
        toolMessages,
        finalAnswer: null,
    };
}

describe('advice-generation routeAfterToolActor', () => {
    it('MAX_TOOL_ITERATIONS matches advice generation budget constant', () => {
        expect(MAX_TOOL_ITERATIONS).toBe(ADVICE_GENERATION_MAX_TOOL_ITERATIONS);
        expect(MAX_TOOL_ITERATIONS).toBe(25);
    });

    it('routes to compile_result when the last tool message is finish', () => {
        const state = stateWithAiRounds(1, 'finish');
        expect(routeAfterToolActor(state)).toBe('compile_result');
    });

    it('loops to tool_actor after lookup_ssvc_cisa_outcome (before finish)', () => {
        const state = stateWithAiRounds(1, 'lookup_ssvc_cisa_outcome');
        expect(routeAfterToolActor(state)).toBe('tool_actor');
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
