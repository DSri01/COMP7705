import { describe, it, expect } from '@jest/globals';
import {
    MAX_CONTEXT_WINDOW_LENGTH,
    TOKENS_PER_CHAR,
    USABLE_CONTEXT_TOKEN_FRACTION,
    USABLE_CONTEXT_TOKEN_LENGTH,
    usableContextCharBudget,
    derivePlatformContextConfig,
    PLATFORM_CONTEXT_CONFIG,
} from '../../../../src/agents/lib/context/config.js';

describe('context config', () => {
    it('defines window and usable token budget from constants', () => {
        expect(MAX_CONTEXT_WINDOW_LENGTH).toBe(128_000);
        expect(USABLE_CONTEXT_TOKEN_FRACTION).toBe(0.8);
        expect(USABLE_CONTEXT_TOKEN_LENGTH).toBe(102_400);
        expect(TOKENS_PER_CHAR).toBe(0.6);
        expect(usableContextCharBudget()).toBe(Math.floor(102_400 / 0.6));
    });

    it('PLATFORM_CONTEXT_CONFIG matches derivePlatformContextConfig()', () => {
        expect(PLATFORM_CONTEXT_CONFIG).toEqual(derivePlatformContextConfig());
    });

    it('enforces read/event ordering and chunky CVE-scale reads', () => {
        const c = PLATFORM_CONTEXT_CONFIG;
        expect(c.maxReadRangeChars).toBeGreaterThanOrEqual(20_000);
        expect(c.maxEventChars).toBeGreaterThanOrEqual(c.maxReadRangeChars);
        expect(c.compactAboveChars).toBeGreaterThanOrEqual(65_000);
        expect(c.workingAreaMaxChars).toBeGreaterThanOrEqual(15_000);
        expect(c.noTruncateToolNames).toContain('finish');
    });
});
