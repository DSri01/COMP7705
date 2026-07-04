import { describe, it, expect } from '@jest/globals';

import { createWebSearchProviderFromConfiguration } from '../../../src/web/search/create-web-search-provider.js';
import { FirecrawlWebSearchProvider } from '../../../src/web/search/providers/firecrawl.js';

describe('createWebSearchProviderFromConfiguration', () => {
    it('returns mock Wikipedia provider for mockWikipedia config', async () => {
        const provider = createWebSearchProviderFromConfiguration({ provider: 'mockWikipedia' });

        const result = await provider.search('log4shell');

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }

        expect(result.hits[0]?.url).toBe('https://en.wikipedia.org/wiki/Log4Shell');
    });

    it('returns FirecrawlWebSearchProvider for firecrawl config', () => {
        const provider = createWebSearchProviderFromConfiguration({
            provider: 'firecrawl',
            apiKey: 'fc-test-key',
            maxResults: 3,
        });

        expect(provider).toBeInstanceOf(FirecrawlWebSearchProvider);
    });
});
