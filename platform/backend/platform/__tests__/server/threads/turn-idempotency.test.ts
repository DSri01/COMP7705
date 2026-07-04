import { describe, it, expect } from '@jest/globals';
import { turnCacheKey } from '../../../src/server/threads/turn-idempotency.js';

describe('turnCacheKey', () => {
    it('combines agentId, threadId, and index', () => {
        expect(turnCacheKey('platform-assistant', 'abc', 0)).toBe(
            'platform-assistant:abc:0',
        );
        expect(turnCacheKey('platform-assistant', 'abc', 5)).toBe(
            'platform-assistant:abc:5',
        );
    });

    it('scopes keys by agentId', () => {
        expect(turnCacheKey('agent-a', 'thread-1', 0)).not.toBe(
            turnCacheKey('agent-b', 'thread-1', 0),
        );
    });
});
