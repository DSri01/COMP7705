import { describe, it, expect } from '@jest/globals';

import { createMockWikipediaWebSearchProvider } from '../../../src/web/search/providers/mock-wikipedia.js';

describe('createMockWikipediaWebSearchProvider', () => {
    const provider = createMockWikipediaWebSearchProvider();

    it('returns ok: false for empty query without throwing', async () => {
        const result = await provider.search('   ');

        expect(result).toEqual({ ok: false, error: 'Query must not be empty' });
    });

    it('returns stable Log4j keyword hits', async () => {
        const result = await provider.search('apache log4j vulnerability');

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        expect(result.hits).toHaveLength(2);
        expect(result.hits[0]).toEqual({
            url: 'https://en.wikipedia.org/wiki/Log4Shell',
            additionalData: {
                title: 'Log4Shell',
                snippet: expect.stringContaining('CVE-2021-44228'),
                rank: 1,
            },
        });
        expect(result.hits[1]?.additionalData).toMatchObject({ rank: 2 });
    });

    it('returns deterministic fallback hits for unknown queries', async () => {
        const first = await provider.search('buffer overflow');
        const second = await provider.search('buffer overflow');

        expect(first).toEqual(second);
        if (!first.ok) {
            return;
        }

        expect(first.hits).toHaveLength(3);
        expect(first.hits[0]?.url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
        expect(first.hits[0]?.additionalData).toMatchObject({
            title: 'Buffer',
            rank: 1,
        });
    });

    it('uses HTTPS Wikipedia URLs with title, snippet, and rank in additionalData', async () => {
        const result = await provider.search('ssrf attack');

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        for (const hit of result.hits) {
            expect(hit.url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
            expect(hit.additionalData).toMatchObject({
                title: expect.any(String),
                snippet: expect.any(String),
                rank: expect.any(Number),
            });
        }
    });
});
