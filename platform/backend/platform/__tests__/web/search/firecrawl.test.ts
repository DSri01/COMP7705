import { describe, it, expect } from '@jest/globals';

import { mapFirecrawlWebToHits } from '../../../src/web/search/providers/firecrawl.js';

describe('mapFirecrawlWebToHits', () => {
    it('maps SearchResultWeb rows to WebSearchHit', () => {
        const hits = mapFirecrawlWebToHits([
            {
                url: 'https://example.com/advisory',
                title: 'Advisory',
                description: 'Details',
                category: 'web',
            },
        ]);

        expect(hits).toEqual([
            {
                url: 'https://example.com/advisory',
                additionalData: {
                    rank: 1,
                    title: 'Advisory',
                    snippet: 'Details',
                    category: 'web',
                },
            },
        ]);
    });

    it('omits optional additionalData keys when absent on SearchResultWeb', () => {
        const hits = mapFirecrawlWebToHits([{ url: 'https://example.com/minimal' }]);

        expect(hits).toEqual([
            {
                url: 'https://example.com/minimal',
                additionalData: { rank: 1 },
            },
        ]);
    });

    it('maps Document rows using metadata.sourceURL', () => {
        const hits = mapFirecrawlWebToHits([
            {
                summary: 'Page summary',
                metadata: {
                    sourceURL: 'https://example.com/doc',
                    title: 'Doc title',
                },
            },
        ]);

        expect(hits).toEqual([
            {
                url: 'https://example.com/doc',
                additionalData: {
                    rank: 1,
                    title: 'Doc title',
                    snippet: 'Page summary',
                },
            },
        ]);
    });

    it('maps Document rows using metadata.ogUrl when sourceURL is missing', () => {
        const hits = mapFirecrawlWebToHits([
            {
                metadata: {
                    ogUrl: 'https://example.com/og',
                    ogTitle: 'OG title',
                    ogDescription: 'OG description',
                },
            },
        ]);

        expect(hits).toEqual([
            {
                url: 'https://example.com/og',
                additionalData: {
                    rank: 1,
                    title: 'OG title',
                    snippet: 'OG description',
                },
            },
        ]);
    });

    it('skips Document rows without a resolvable URL', () => {
        expect(mapFirecrawlWebToHits([{ markdown: '# hi' }])).toEqual([]);
    });

    it('assigns sequential ranks across mixed SearchResultWeb and Document rows', () => {
        const hits = mapFirecrawlWebToHits([
            { url: 'https://example.com/a', title: 'A' },
            { markdown: 'skip me' },
            {
                metadata: {
                    sourceURL: 'https://example.com/b',
                    title: 'B',
                },
            },
        ]);

        expect(hits).toHaveLength(2);
        expect(hits[0]?.additionalData.rank).toBe(1);
        expect(hits[1]?.additionalData.rank).toBe(2);
        expect(hits[1]?.url).toBe('https://example.com/b');
    });

    it('returns empty array for undefined or empty web', () => {
        expect(mapFirecrawlWebToHits(undefined)).toEqual([]);
        expect(mapFirecrawlWebToHits([])).toEqual([]);
    });
});
