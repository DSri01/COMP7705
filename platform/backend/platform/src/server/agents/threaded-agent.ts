/**
 * HTTP-facing contract for conversational agents exposed at `/agents/:agentId/threads`.
 * Graph-specific adapters implement this port under {@link ./adapters/}.
 */

/** One turn in the thread transcript returned by the REST API (no tool messages). */
export interface ThreadMessage {
    role: 'human' | 'assistant';
    content: string;
}

/**
 * Agent implementation invoked by {@link ../threads/threads.service.js}.
 * LangGraph checkpointing uses the same `threadId` passed to these methods.
 */
export interface ThreadedAgent {
    /** Runs one user turn and returns the final assistant reply text. */
    runTurn(threadId: string, userMessage: string): Promise<string>;

    /** Returns human/assistant history for idempotency checks and GET …/messages. */
    getMessages(threadId: string): Promise<ThreadMessage[]>;
}
