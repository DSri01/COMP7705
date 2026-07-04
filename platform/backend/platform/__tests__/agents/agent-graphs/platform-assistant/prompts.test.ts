import { describe, it, expect, beforeEach } from '@jest/globals';
import { AIMessage, ToolMessage } from '@langchain/core/messages';

import { buildPlatformAssistantToolActorPrompt } from '../../../../src/agents/agent-graphs/platform-assistant/prompts.js';
import type { PlatformAssistantStateType } from '../../../../src/agents/agent-graphs/platform-assistant/state.js';
import {
    PLATFORM_ASSISTANT_MAX_TOOL_ITERATIONS,
    PLATFORM_ASSISTANT_TURN_TOOL_LIMITS,
    PlatformAssistantTurnBudget,
} from '../../../../src/agents/agent-graphs/platform-assistant/turn-budget.js';

describe('buildPlatformAssistantToolActorPrompt', () => {
    const threadId = 'prompt-test-thread';
    let turnBudget: PlatformAssistantTurnBudget;

    const baseState: PlatformAssistantStateType = {
        userMessage: 'search the web for CVE-2026-31789',
        chatHistory: [],
        toolMessages: [],
        finalAnswer: null,
    };

    beforeEach(() => {
        turnBudget = new PlatformAssistantTurnBudget();
        turnBudget.beginTurn(threadId);
    });

    it('includes static per-request budget policy and dynamic remaining section', () => {
        const prompt = buildPlatformAssistantToolActorPrompt(
            baseState,
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('Per-request tool budgets');
        expect(prompt).toContain('Budget remaining (current user request)');
        expect(prompt).toContain(
            `web_search: ${PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_search} calls max`,
        );
        expect(prompt).toContain(
            `web_fetch_url_markdown: ${PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_fetch_url_markdown} calls max`,
        );
        expect(prompt).toContain(
            `get_cve_research_document: ${PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.get_cve_research_document} calls max`,
        );
        expect(prompt).toContain(
            `step 1 of ${PLATFORM_ASSISTANT_MAX_TOOL_ITERATIONS}`,
        );
        expect(prompt).toContain(`${PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_search} calls left`);
    });

    it('reflects consumed budget in the dynamic section', () => {
        turnBudget.tryConsume(threadId, 'web_search');
        turnBudget.tryConsume(threadId, 'web_search');

        const prompt = buildPlatformAssistantToolActorPrompt(
            baseState,
            [],
            turnBudget,
            threadId,
            3,
        );

        expect(prompt).toContain('web_search: you have 1 call left');
        expect(prompt).toContain('(2/3 used)');
        expect(prompt).toContain('step 3 of 25');
    });

    it('includes CVE summary routing with empty vs stored researchSummary default', () => {
        const prompt = buildPlatformAssistantToolActorPrompt(
            {
                ...baseState,
                userMessage: 'Can you give me a summary for CVE-2026-31789?',
            },
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('CVE summary routing');
        expect(prompt).toContain('call_summary_generation_agent');
        expect(prompt).toContain('researchSummary is empty');
        expect(prompt).toContain('researchSummary already has text');
        expect(prompt).toContain('summary of a specific CVE');
        expect(prompt).toContain('self-summary escape hatch');
        expect(prompt).toContain('Update / refresh / save the research summary');
    });

    it('requires sub-agent before update when user asks to save research summary', () => {
        const prompt = buildPlatformAssistantToolActorPrompt(
            {
                ...baseState,
                userMessage: 'Please update the research summary for CVE-2026-31789',
            },
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('call_summary_generation_agent(cveId) first');
        expect(prompt).toContain('update_cve_research_summary only after');
    });

    it('includes image-CVE advice routing with unset vs stored advice default', () => {
        const prompt = buildPlatformAssistantToolActorPrompt(
            {
                ...baseState,
                userMessage: 'Can you give me advice for CVE-2026-31789 on my auth component?',
            },
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('Image-CVE advice routing');
        expect(prompt).toContain('call_advice_generation_agent');
        expect(prompt).toContain('advice.state === "unset"');
        expect(prompt).toContain('advice.state === "set"');
        expect(prompt).toContain('self-advice escape hatch');
        expect(prompt).toContain('Update / refresh / save advice');
    });

    it('requires sub-agent before update when user asks to save advice', () => {
        const prompt = buildPlatformAssistantToolActorPrompt(
            {
                ...baseState,
                userMessage: 'Please update the advice for CVE-2026-31789 on component auth-api',
            },
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('call_advice_generation_agent(projectId, componentId, cveId) first');
        expect(prompt).toContain('update_image_cve_advice only after');
    });

    it('includes mandatory tool_call contract, examples, and anti-patterns', () => {
        const prompt = buildPlatformAssistantToolActorPrompt(
            {
                ...baseState,
                userMessage: 'Tell me about the critical CVEs affecting our projects',
            },
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('Every LLM response MUST include at least one structured tool_call');
        expect(prompt).toContain('zero tool_calls is INVALID');
        expect(prompt).toContain('Examples (illustrative');
        expect(prompt).toContain('Portfolio overview');
        expect(prompt).toContain('get_project_image_cve_stats');
        expect(prompt).toContain('Anti-patterns');
        expect(prompt).toContain('Every step (mandatory)');
        expect(prompt).not.toContain('Project / portfolio roll-up routing');
        expect(prompt).not.toContain('critical/high CVEs across projects');
    });

    it('includes advice disagreement and regenerate flow with additionalContext', () => {
        const prompt = buildPlatformAssistantToolActorPrompt(
            {
                ...baseState,
                userMessage: 'That SSVC outcome is wrong — mission impact should be High',
            },
            [],
            turnBudget,
            threadId,
            1,
        );

        expect(prompt).toContain('Advice disagreement and regenerate');
        expect(prompt).toContain('additionalContext');
        expect(prompt).toContain('Clarify first');
        expect(prompt).toContain('No fixed format');
        expect(prompt).toContain('paste the full conversation');
        expect(prompt).toContain('You do not have SSVC tools');
        expect(prompt).toContain('advice-regenerate');
        expect(prompt).toContain('rejects, disagrees with');
        expect(prompt).toContain('Do not invent CISA SSVC outcomes');
    });

    it('includes continued-turn guidance when tool messages exist', () => {
        const state: PlatformAssistantStateType = {
            ...baseState,
            toolMessages: [
                new AIMessage({ content: 'searching' }),
                new ToolMessage({
                    content: '{"ok":true}',
                    tool_call_id: 'tc-1',
                    name: 'web_search',
                }),
            ],
        };

        const prompt = buildPlatformAssistantToolActorPrompt(state, [], turnBudget, threadId, 2);

        expect(prompt).toContain('This turn (continued)');
        expect(prompt).toContain('Progress');
        expect(prompt).toContain('web_search');
    });
});
