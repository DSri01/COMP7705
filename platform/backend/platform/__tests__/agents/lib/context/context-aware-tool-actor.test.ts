import { describe, it, expect, jest } from '@jest/globals';
import { AIMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import {
    createContextAwareToolActorNode,
    NO_TOOL_CALLS_FEEDBACK,
    NO_TOOL_CALLS_MAX_RETRIES,
} from '../../../../src/agents/lib/context/context-aware-tool-actor.js';
import { AgentContextManager } from '../../../../src/agents/lib/context/manager.js';
import { CONSERVATIVE_CONTEXT_CONFIG } from '../../../../src/agents/lib/context/config.js';
import type { ToolCapableLlm } from '../../../../src/agents/lib/tool-loop/tool-loop.js';

const finishTool = tool(async ({ response }: { response: string }) => response, {
    name: 'finish',
    description: 'End the turn',
    schema: z.object({
        response: z.string(),
    }),
});

describe('createContextAwareToolActorNode', () => {
    it('retries invoke when the model returns no tool_calls, then records a successful tool turn', async () => {
        const invoke = jest
            .fn<() => Promise<AIMessage>>()
            .mockResolvedValueOnce(new AIMessage({ content: '' }))
            .mockResolvedValueOnce(
                new AIMessage({
                    content: '',
                    tool_calls: [
                        {
                            id: 'tc-finish',
                            name: 'finish',
                            args: { response: 'done' },
                            type: 'tool_call',
                        },
                    ],
                }),
            );

        const llm = {
            bindTools: () => ({ invoke }),
        } as unknown as ToolCapableLlm;

        const contextManager = new AgentContextManager(
            { ...CONSERVATIVE_CONTEXT_CONFIG, debugLog: false },
            'test-agent',
        );
        const node = createContextAwareToolActorNode({
            llm,
            tools: [finishTool] as Parameters<typeof createContextAwareToolActorNode>[0]['tools'],
            buildPrompt: () => 'agent prompt',
            contextManager,
        });

        await node({ toolMessages: [] }, { configurable: { thread_id: 'retry-thread' } });

        expect(invoke).toHaveBeenCalledTimes(2);
        const retryPayload = JSON.stringify(invoke.mock.calls);
        expect(retryPayload).toContain(NO_TOOL_CALLS_FEEDBACK);

        const events = contextManager.getRecentEvents('retry-thread');
        expect(events.some((e) => e.kind === 'tool' && e.toolName === 'finish')).toBe(true);
        expect(events.filter((e) => e.kind === 'ai' && e.content === '')).toHaveLength(0);
    });

    it('records the last AI message when retries are exhausted without tool_calls', async () => {
        const invoke = jest
            .fn<() => Promise<AIMessage>>()
            .mockResolvedValue(new AIMessage({ content: 'still stuck' }));

        const llm = {
            bindTools: () => ({ invoke }),
        } as unknown as ToolCapableLlm;

        const contextManager = new AgentContextManager(
            { ...CONSERVATIVE_CONTEXT_CONFIG, debugLog: false },
            'test-agent',
        );
        const node = createContextAwareToolActorNode({
            llm,
            tools: [finishTool] as Parameters<typeof createContextAwareToolActorNode>[0]['tools'],
            buildPrompt: () => 'agent prompt',
            contextManager,
        });

        await node({ toolMessages: [] }, { configurable: { thread_id: 'fail-thread' } });

        expect(invoke).toHaveBeenCalledTimes(1 + NO_TOOL_CALLS_MAX_RETRIES);
        const events = contextManager.getRecentEvents('fail-thread');
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ kind: 'ai', content: 'still stuck' });
    });
});
