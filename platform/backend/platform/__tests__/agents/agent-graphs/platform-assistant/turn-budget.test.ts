import { describe, it, expect, beforeEach } from '@jest/globals';

import {
    PLATFORM_ASSISTANT_MAX_TOOL_ITERATIONS,
    PLATFORM_ASSISTANT_TURN_TOOL_LIMITS,
    PlatformAssistantTurnBudget,
} from '../../../../src/agents/agent-graphs/platform-assistant/turn-budget.js';

describe('PlatformAssistantTurnBudget', () => {
    const threadId = 'test-thread';
    let budget: PlatformAssistantTurnBudget;

    beforeEach(() => {
        budget = new PlatformAssistantTurnBudget();
        budget.beginTurn(threadId);
    });

    it('tryConsume allows calls up to the limit', () => {
        for (let i = 0; i < PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_search; i++) {
            expect(budget.tryConsume(threadId, 'web_search')).toBeNull();
        }
        expect(budget.tryConsume(threadId, 'web_search')).toContain('ERROR:');
        expect(budget.tryConsume(threadId, 'web_search')).toContain('0 calls left');
    });

    it('beginTurn resets usage for the thread', () => {
        budget.tryConsume(threadId, 'web_search');
        budget.beginTurn(threadId);
        expect(budget.getSnapshot(threadId)[0]?.used).toBe(0);
        expect(budget.getSnapshot(threadId)[0]?.remaining).toBe(
            PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_search,
        );
    });

    it('tryConsume enforces limits for all budgeted tools', () => {
        for (const toolName of Object.keys(
            PLATFORM_ASSISTANT_TURN_TOOL_LIMITS,
        ) as (keyof typeof PLATFORM_ASSISTANT_TURN_TOOL_LIMITS)[]) {
            const limit = PLATFORM_ASSISTANT_TURN_TOOL_LIMITS[toolName];
            const localBudget = new PlatformAssistantTurnBudget();
            localBudget.beginTurn(threadId);
            for (let i = 0; i < limit; i++) {
                expect(localBudget.tryConsume(threadId, toolName)).toBeNull();
            }
            expect(localBudget.tryConsume(threadId, toolName)).toContain('ERROR:');
        }
    });

    it('formatPromptSection includes remaining counts and step budget', () => {
        budget.tryConsume(threadId, 'web_fetch_url_markdown');
        const section = budget.formatPromptSection(threadId, 3);

        expect(section).toContain('web_search');
        expect(section).toContain(`${PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_search} calls left`);
        expect(section).toContain('web_fetch_url_markdown');
        expect(section).toContain('5 calls left');
        expect(section).toContain(`step 3 of ${PLATFORM_ASSISTANT_MAX_TOOL_ITERATIONS}`);
    });
});
