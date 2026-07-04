import { describe, it, expect } from '@jest/globals';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

import {
    MAX_TOOL_ITERATIONS,
    routeAfterToolActor,
} from '../../../../src/agents/agent-graphs/summary-generation-agent/edges.js';
import { SUMMARY_GENERATION_MAX_TOOL_ITERATIONS } from '../../../../src/agents/agent-graphs/summary-generation-agent/turn-budget.js';
import type { SummaryGenerationStateType } from '../../../../src/agents/agent-graphs/summary-generation-agent/state.js';

function stateWithAiRounds(
    aiRounds: number,
    lastToolName = 'get_cve',
): SummaryGenerationStateType {
    const toolMessages: SummaryGenerationStateType['toolMessages'] = [];
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
        cveId: 'CVE-2024-00001',
        additionalContext: '',
        toolMessages,
        finalAnswer: null,
    };
}

describe('summary-generation routeAfterToolActor', () => {
    it('MAX_TOOL_ITERATIONS matches summary generation budget constant', () => {
        expect(MAX_TOOL_ITERATIONS).toBe(SUMMARY_GENERATION_MAX_TOOL_ITERATIONS);
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
