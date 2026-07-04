import { describe, it, expect, beforeEach } from '@jest/globals';

import { buildSummaryGenerationToolActorPrompt } from '../../../../src/agents/agent-graphs/summary-generation-agent/prompts.js';
import type { SummaryGenerationStateType } from '../../../../src/agents/agent-graphs/summary-generation-agent/state.js';
import {
    SUMMARY_GENERATION_MAX_TOOL_ITERATIONS,
    SUMMARY_GENERATION_TURN_TOOL_LIMITS,
    SummaryGenerationTurnBudget,
} from '../../../../src/agents/agent-graphs/summary-generation-agent/turn-budget.js';

describe('buildSummaryGenerationToolActorPrompt', () => {
    const threadId = 'summary-prompt-thread';
    let turnBudget: SummaryGenerationTurnBudget;

    const baseState: SummaryGenerationStateType = {
        cveId: 'CVE-2024-00001',
        additionalContext: '',
        toolMessages: [],
        finalAnswer: null,
    };

    beforeEach(() => {
        turnBudget = new SummaryGenerationTurnBudget();
        turnBudget.beginTurn(threadId);
    });

    it('includes task budgets and target cveId', () => {
        const prompt = buildSummaryGenerationToolActorPrompt(
            baseState,
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('summary-generation agent');
        expect(prompt).toContain('CVE-2024-00001');
        expect(prompt).toContain(
            `get_cve_research_document: ${SUMMARY_GENERATION_TURN_TOOL_LIMITS.get_cve_research_document} calls max`,
        );
        expect(prompt).toContain(`step 1 of ${SUMMARY_GENERATION_MAX_TOOL_ITERATIONS}`);
        expect(prompt).toContain('Budget remaining (current summary generation task)');
    });

    it('includes additional context section when provided', () => {
        const prompt = buildSummaryGenerationToolActorPrompt(
            { ...baseState, additionalContext: 'Operator notes here.' },
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('Additional context from operator');
        expect(prompt).toContain('Operator notes here.');
    });

    it('includes mandatory tool_call contract, examples, and anti-patterns', () => {
        const prompt = buildSummaryGenerationToolActorPrompt(
            baseState,
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('Every LLM response MUST include at least one structured tool_call');
        expect(prompt).toContain('Examples (illustrative');
        expect(prompt).toContain('Anti-patterns');
        expect(prompt).toContain('Every step (mandatory)');
    });
});
