import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    createWebSearchTool,
    webSearchHandler,
    webSearchHitsToResponsePayload,
} from '../../../../src/agents/tool-registry/web/web-search.js';
import {
    PLATFORM_ASSISTANT_TURN_TOOL_LIMITS,
    PlatformAssistantTurnBudget,
} from '../../../../src/agents/agent-graphs/platform-assistant/turn-budget.js';
import type { WebSearchProvider } from '../../../../src/web/search/types.js';

describe('web_search tool', () => {
    const searchMock = jest.fn<WebSearchProvider['search']>();

    const provider: WebSearchProvider = {
        search: searchMock,
    };

    beforeEach(() => {
        searchMock.mockReset();
    });

    it('webSearchHandler returns ERROR when provider reports failure', async () => {
        searchMock.mockResolvedValue({ ok: false, error: 'rate limited' });

        const text = await webSearchHandler('log4j', { provider });

        expect(searchMock).toHaveBeenCalledWith('log4j');
        expect(text).toBe('ERROR: rate limited');
    });

    it('webSearchHandler returns JSON hits on success', async () => {
        const hits = [
            {
                url: 'https://en.wikipedia.org/wiki/Log4Shell',
                additionalData: { title: 'Log4Shell', snippet: '…', rank: 1 },
            },
        ];
        searchMock.mockResolvedValue({ ok: true, hits });

        const text = await webSearchHandler('log4j', { provider });

        expect(JSON.parse(text)).toEqual(webSearchHitsToResponsePayload(hits));
    });

    it('webSearchHandler returns ERROR when turn budget is exhausted', async () => {
        searchMock.mockResolvedValue({ ok: true, hits: [] });
        const turnBudget = new PlatformAssistantTurnBudget();
        const threadId = 'budget-thread';
        turnBudget.beginTurn(threadId);
        const deps = {
            provider,
            turnBudget,
            resolveThreadId: () => threadId,
        };

        for (let i = 0; i < PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_search; i++) {
            await webSearchHandler('q', deps);
        }

        const blocked = await webSearchHandler('q', deps);
        expect(blocked).toContain('ERROR:');
        expect(searchMock).toHaveBeenCalledTimes(PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_search);
    });

    it('createWebSearchTool invokes handler via LangChain', async () => {
        searchMock.mockResolvedValue({
            ok: true,
            hits: [
                {
                    url: 'https://en.wikipedia.org/wiki/Log4Shell',
                    additionalData: { title: 'Log4Shell', snippet: '…', rank: 1 },
                },
            ],
        });

        const tool = createWebSearchTool({ provider });
        const result = await tool.invoke({ query: 'log4j' });

        expect(JSON.parse(result)).toMatchObject({ ok: true });
        expect(result).toContain('Log4Shell');
    });
});
