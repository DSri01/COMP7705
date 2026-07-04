import { describe, it, expect } from '@jest/globals';
import { shouldTruncateToolEvent, capToolEventContent } from '../../../../src/agents/lib/context/truncate-policy.js';

describe('shouldTruncateToolEvent', () => {
    it('truncates all tools by default', () => {
        expect(
            shouldTruncateToolEvent('read_context_range', {
                noTruncateToolNames: [],
            }),
        ).toBe(true);
    });

    it('skips tools in noTruncateToolNames', () => {
        expect(
            shouldTruncateToolEvent('finish', {
                noTruncateToolNames: ['finish'],
            }),
        ).toBe(false);
    });

    it('only truncates tools listed in truncateToolNames when set', () => {
        const policy = {
            noTruncateToolNames: [] as string[],
            truncateToolNames: ['read_context_range'],
        };
        expect(shouldTruncateToolEvent('read_context_range', policy)).toBe(true);
        expect(shouldTruncateToolEvent('finish', policy)).toBe(false);
    });

    it('noTruncateToolNames wins over truncateToolNames', () => {
        expect(
            shouldTruncateToolEvent('finish', {
                noTruncateToolNames: ['finish'],
                truncateToolNames: ['finish', 'calculate'],
            }),
        ).toBe(false);
    });
});

describe('capToolEventContent', () => {
    it('preserves long finish payloads when exempt', () => {
        const long = 'x'.repeat(500);
        const { text, truncated } = capToolEventContent(long, 'finish', {
            maxEventChars: 100,
            noTruncateToolNames: ['finish'],
        });
        expect(truncated).toBe(false);
        expect(text).toBe(long);
    });

    it('truncates whitelisted tools', () => {
        const long = 'x'.repeat(500);
        const { text, truncated } = capToolEventContent(long, 'read_context_range', {
            maxEventChars: 100,
            noTruncateToolNames: ['finish'],
            truncateToolNames: ['read_context_range'],
        });
        expect(truncated).toBe(true);
        expect(text).toContain('truncated');
    });
});
