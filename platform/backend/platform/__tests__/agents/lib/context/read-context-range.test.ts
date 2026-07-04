import { describe, it, expect, beforeEach } from '@jest/globals';
import { sharedResourceStore } from '../../../../src/agents/lib/context/resource-store.js';
import {
    executeReadContextRange,
    formatReadContextRangeResponse,
} from '../../../../src/agents/lib/context/read-context-range.js';
import { maxStoredPayloadChars } from '../../../../src/agents/lib/context/format.js';

const limits = { maxReadRangeChars: 180, maxEventChars: 200 };
const storedCap = maxStoredPayloadChars(limits.maxEventChars);

describe('executeReadContextRange', () => {
    beforeEach(() => {
        sharedResourceStore.register('test:doc', 'line one\nline two\nline three\nline four');
    });

    it('reads by character range', () => {
        const result = executeReadContextRange(
            { resourceRef: 'test:doc', startChar: 0, endChar: 8 },
            limits,
        );
        expect(result.mode).toBe('char');
        expect(result.text).toBe('line one');
        expect(result.clamped).toBe(false);
    });

    it('reads by 1-based inclusive lines', () => {
        const result = executeReadContextRange(
            { resourceRef: 'test:doc', startLine: 2, endLine: 3 },
            limits,
        );
        expect(result.mode).toBe('line');
        expect(result.text).toBe('line two\nline three');
    });

    it('clamps oversized slice at maxReadRangeChars', () => {
        const result = executeReadContextRange(
            { resourceRef: 'test:doc', startChar: 0, endChar: 100 },
            { maxReadRangeChars: 10, maxEventChars: 200 },
        );
        expect(result.clamped).toBe(true);
        expect(result.returnedChars).toBe(10);
    });

    it('formatReadContextRangeResponse fits within maxEventChars', () => {
        sharedResourceStore.register('test:big', 'x'.repeat(500));
        const result = executeReadContextRange(
            { resourceRef: 'test:big', startChar: 0, endChar: 500 },
            limits,
        );
        const json = formatReadContextRangeResponse(result, limits);
        expect(json.length).toBeLessThanOrEqual(storedCap);
        const parsed = JSON.parse(json) as { maxEventChars: number; text: string };
        expect(parsed.maxEventChars).toBe(200);
        expect(parsed.text.length).toBeLessThanOrEqual(limits.maxReadRangeChars);
    });

    it('formatReadContextRangeResponse includes configured limits', () => {
        const result = executeReadContextRange(
            { resourceRef: 'test:doc', startLine: 1, endLine: 1 },
            limits,
        );
        const parsed = JSON.parse(formatReadContextRangeResponse(result, limits)) as {
            maxReadRangeChars: number;
            maxEventChars: number;
        };
        expect(parsed.maxReadRangeChars).toBe(180);
        expect(parsed.maxEventChars).toBe(200);
    });
});
