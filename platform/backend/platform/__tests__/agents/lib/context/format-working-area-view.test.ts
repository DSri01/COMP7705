import { describe, it, expect } from '@jest/globals';
import {
    formatWorkingAreaViewResponse,
    maxStoredPayloadChars,
} from '../../../../src/agents/lib/context/format.js';

describe('formatWorkingAreaViewResponse', () => {
    it('returns full text when under cap', () => {
        const text = '1. line one\n2. line two';
        expect(formatWorkingAreaViewResponse(text, 512)).toBe(text);
    });

    it('caps oversized notebook with note', () => {
        const full = '1. ' + 'x'.repeat(600);
        const capped = formatWorkingAreaViewResponse(full, 200);
        expect(capped.length).toBeLessThanOrEqual(maxStoredPayloadChars(200));
        expect(capped).toContain('Context: working area');
    });
});
