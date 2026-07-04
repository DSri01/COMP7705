/** Cached result for a completed idempotent POST …/messages turn. */
export interface CompletedTurnRecord {
    message: string;
    reply: string;
    userMessageIndex: number;
    responseMessageIndex: number;
}

/**
 * Stable cache key for deduplicating retries of the same `(agentId, threadId, newMessageIndex)`.
 */
export function turnCacheKey(
    agentId: string,
    threadId: string,
    newMessageIndex: number,
): string {
    return `${agentId}:${threadId}:${newMessageIndex}`;
}
