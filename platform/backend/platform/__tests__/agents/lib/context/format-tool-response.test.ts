import { describe, it, expect } from '@jest/globals';
import {
    formatGetContextLengthResponse,
    fitJsonToMaxEventChars,
    maxStoredPayloadChars,
} from '../../../../src/agents/lib/context/format.js';
import { CONSERVATIVE_CONTEXT_CONFIG } from '../../../../src/agents/lib/context/config.js';
import { readLimitsFromConfig } from '../../../../src/agents/lib/context/config.js';

describe('format-tool-response', () => {
    const conservative = readLimitsFromConfig(CONSERVATIVE_CONTEXT_CONFIG);

    it('maxStoredPayloadChars reserves slack under maxEventChars', () => {
        expect(maxStoredPayloadChars(512)).toBe(508);
    });

    it('formatGetContextLengthResponse fits conservative maxEventChars', () => {
        const json = formatGetContextLengthResponse('doc:whale', 1200, 40, conservative);
        expect(json.length).toBeLessThanOrEqual(maxStoredPayloadChars(conservative.maxEventChars));
        const parsed = JSON.parse(json) as { charLength: number; maxEventChars: number };
        expect(parsed.charLength).toBe(1200);
        expect(parsed.maxEventChars).toBe(512);
        expect(json).not.toContain('hint');
    });

    it('fitJsonToMaxEventChars shrinks oversized document list', () => {
        const items = Array.from({ length: 20 }, (_, i) => ({
            resourceRef: `doc:${i}`,
            title: `Title ${i}`,
            description: 'x'.repeat(200),
        }));
        const json = fitJsonToMaxEventChars(
            { documents: items, maxReadRangeChars: 400, maxEventChars: 512 },
            { maxReadRangeChars: 400, maxEventChars: 512 },
        );
        expect(json.length).toBeLessThanOrEqual(508);
        expect(JSON.parse(json)).toBeTruthy();
    });
});
