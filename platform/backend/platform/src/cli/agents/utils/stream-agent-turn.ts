import type { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { AgentLogger, logNodeUpdate } from '../../../agents/lib/loggers/agent-logger.js';

export interface StreamAgentTurnOptions {
    threadId: string;
    recursionLimit?: number;
    callbacks?: BaseCallbackHandler[];
}

export type StreamableAgent = {
    stream: (
        input: Record<string, unknown>,
        options: {
            configurable: { thread_id: string };
            recursionLimit: number;
            callbacks?: BaseCallbackHandler[];
            streamMode: 'updates';
        },
    ) => Promise<AsyncIterable<Record<string, unknown>>>;
};

/**
 * Streams one agent turn with node and LLM/tool logging. Returns finalAnswer when set.
 */
export async function streamAgentTurn(
    agent: StreamableAgent,
    input: Record<string, unknown>,
    options: StreamAgentTurnOptions,
): Promise<string | null> {
    const logger = options.callbacks?.[0] ?? new AgentLogger();
    const callbacks = options.callbacks ?? [logger];

    console.log('\n─── Agent run ───────────────────────────────────────');

    const eventStream = await agent.stream(input, {
        configurable: { thread_id: options.threadId },
        recursionLimit: options.recursionLimit ?? 50,
        callbacks,
        streamMode: 'updates',
    });

    let finalAnswer: string | null = null;

    for await (const event of eventStream) {
        logNodeUpdate(event);
        const update = Object.values(event)[0] as Record<string, unknown>;
        if (typeof update?.['finalAnswer'] === 'string') {
            finalAnswer = update['finalAnswer'];
        }
    }

    console.log('\n─────────────────────────────────────────────────────');

    return finalAnswer;
}
