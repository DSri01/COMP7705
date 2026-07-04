import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { describe, it, expect, beforeEach } from '@jest/globals';

import { buildAdviceGenerationToolActorPrompt } from '../../../../src/agents/agent-graphs/advice-generation-agent/prompts.js';
import type { AdviceGenerationStateType } from '../../../../src/agents/agent-graphs/advice-generation-agent/state.js';
import {
    ADVICE_GENERATION_MAX_TOOL_ITERATIONS,
    ADVICE_GENERATION_TURN_TOOL_LIMITS,
    AdviceGenerationTurnBudget,
} from '../../../../src/agents/agent-graphs/advice-generation-agent/turn-budget.js';

describe('buildAdviceGenerationToolActorPrompt', () => {
    const threadId = 'advice-prompt-thread';
    let turnBudget: AdviceGenerationTurnBudget;

    const baseState: AdviceGenerationStateType = {
        projectId: '11111111-1111-4111-8111-111111111111',
        componentId: '22222222-2222-4222-8222-222222222222',
        cveId: 'CVE-2024-00001',
        imageCveId: '33333333-3333-4333-8333-333333333333',
        additionalContext: '',
        toolMessages: [],
        finalAnswer: null,
    };

    beforeEach(() => {
        turnBudget = new AdviceGenerationTurnBudget();
        turnBudget.beginTurn(threadId);
    });

    it('includes task budgets, SSVC workflow, and target scope', () => {
        const prompt = buildAdviceGenerationToolActorPrompt(
            baseState,
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('advice-generation agent');
        expect(prompt).toContain('CVE-2024-00001');
        expect(prompt).toContain('11111111-1111-4111-8111-111111111111');
        expect(prompt).toContain(
            `get_cve_research_document: ${ADVICE_GENERATION_TURN_TOOL_LIMITS.get_cve_research_document} calls max`,
        );
        expect(prompt).toContain(`step 1 of ${ADVICE_GENERATION_MAX_TOOL_ITERATIONS}`);
        expect(prompt).toContain('Budget remaining (current advice generation task)');
        expect(prompt).toContain('get_image_cve for imageCveId');
        expect(prompt).toContain('CISA SSVC framework (deployer — P08)');
        expect(prompt).toContain('lookup_ssvc_cisa_outcome');
        expect(prompt).toContain('get_ssvc_cisa_framework');
        expect(prompt).toContain('intelHighlights.kev.listed');
        expect(prompt).toContain('SSVC outcome:');
        expect(prompt).not.toContain('TODO P08');
        expect(prompt).toContain('Do **not** use legacy vocabulary');
        expect(prompt).toContain('Image-CVE reading playbook');
    });

    it('reflects consumed budget in the dynamic section', () => {
        turnBudget.tryConsume(threadId, 'get_cve_research_document');
        turnBudget.tryConsume(threadId, 'get_cve_research_document');

        const prompt = buildAdviceGenerationToolActorPrompt(
            baseState,
            [],
            turnBudget,
            threadId,
            3,
        );

        expect(prompt).toContain('get_cve_research_document: you have 13 calls left');
        expect(prompt).toContain('(2/15 used)');
        expect(prompt).toContain('step 3 of 25');
    });

    it('includes additional context section with SSVC override guidance when provided', () => {
        const prompt = buildAdviceGenerationToolActorPrompt(
            { ...baseState, additionalContext: 'Operator notes here.' },
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('Additional context from operator');
        expect(prompt).toContain('Operator notes here.');
        expect(prompt).toContain('honor SSVC overrides');
    });

    it('suggests list_image_cves when imageCveId is not pinned', () => {
        const prompt = buildAdviceGenerationToolActorPrompt(
            { ...baseState, imageCveId: '' },
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('list_image_cves to resolve imageCveId');
    });

    it('reminds to call lookup before finish when lookup not yet done', () => {
        const prompt = buildAdviceGenerationToolActorPrompt(
            {
                ...baseState,
                toolMessages: [
                    new AIMessage({ content: 'reasoning' }),
                    new ToolMessage({ content: '{}', tool_call_id: '1', name: 'get_cve' }),
                ],
            },
            [],
            turnBudget,
            threadId,
            2,
        );

        expect(prompt).toContain('not** called lookup_ssvc_cisa_outcome yet');
    });

    it('notes lookup already done on continued turns', () => {
        const prompt = buildAdviceGenerationToolActorPrompt(
            {
                ...baseState,
                toolMessages: [
                    new AIMessage({ content: 'reasoning' }),
                    new ToolMessage({
                        content: '{"outcome":"Track"}',
                        tool_call_id: '1',
                        name: 'lookup_ssvc_cisa_outcome',
                    }),
                ],
            },
            [],
            turnBudget,
            threadId,
            2,
        );

        expect(prompt).toContain('lookup_ssvc_cisa_outcome already called');
    });

    it('includes mandatory tool_call contract, examples, and anti-patterns', () => {
        const prompt = buildAdviceGenerationToolActorPrompt(
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
